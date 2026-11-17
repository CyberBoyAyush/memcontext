// Cross-app memory: handoff notes, budgeted context, transcript ingest, chat-export import.
import { createHash } from "crypto";
import { and, desc, eq, isNull, ne, or, sql, inArray } from "drizzle-orm";
import type {
  HandoffNote,
  ImportConversationsResponse,
  IngestTranscriptResponse,
  MemoryContextResponse,
  MemorySource,
  MemoryWithRelevance,
  SetHandoffResponse,
  TranscriptMessage,
} from "@memcontext/types";
import { db, memories, memorySources } from "../db/index.js";
import { generateEmbedding } from "./embedding.js";
import { enqueueTranscriptChunk, searchMemories } from "./memory.js";
import { checkMemoryLimit, incrementMemoryCount } from "./subscription.js";
import { invalidateCachedProfile } from "./cache.js";
import { redactSecrets, isOnlySecret } from "../lib/redact.js";
import {
  chunkTranscript,
  DEFAULT_CONTEXT_TOKENS,
  renderContext,
  type ContextLine,
} from "../lib/memory-context.js";
import { detectExportFormat, parseChatGPTExport, parseClaudeExport } from "../lib/import-parsers.js";
import { normalizeProjectName, normalizeScope } from "../utils/index.js";
import { logger } from "../lib/logger.js";

const HANDOFF_TTL_DAYS = 14;
const MAX_HANDOFF_CHARS = 4000;
// Caps per request so one big transcript or export cannot flood the shared extraction queue.
export const MAX_INGEST_CHUNKS = 30;
export const MAX_IMPORT_CHUNKS = 100;

interface Owner {
  userId: string;
  workspaceId: string;
}

/** Lowercase slug for an app name ("Claude Code/2.1" -> "claude-code"); null for generic HTTP clients. */
export function normalizeClient(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const slug = value
    .trim()
    .split(/[/(;]/)[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (!slug || ["node", "undici", "node-fetch", "axios", "python-requests", "python-httpx", "curl", "mozilla"].includes(slug)) {
    return undefined;
  }
  return slug;
}

function handoffScopeConditions(owner: Owner, scope?: string, project?: string, anyProject = false) {
  return [
    eq(memories.workspaceId, owner.workspaceId),
    eq(memories.userId, owner.userId),
    isNull(memories.vaultId),
    eq(memories.memoryType, "member"),
    // Literal (not a bound param) so the partial index applies under generic plans.
    sql`${memories.kind} = 'handoff'`,
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    scope ? eq(memories.scope, scope) : isNull(memories.scope),
    anyProject ? undefined : project ? eq(memories.project, project) : isNull(memories.project),
  ];
}

function toHandoffNote(row: {
  id: string;
  content: string;
  project: string | null;
  scope: string | null;
  client: string | null;
  createdAt: Date;
  validUntil: Date | null;
}): HandoffNote {
  return {
    id: row.id,
    content: row.content,
    ...(row.project ? { project: row.project } : {}),
    ...(row.scope ? { scope: row.scope } : {}),
    ...(row.client ? { client: row.client } : {}),
    createdAt: row.createdAt,
    ...(row.validUntil ? { validUntil: row.validUntil } : {}),
  };
}

const handoffColumns = {
  id: memories.id,
  content: memories.content,
  project: memories.project,
  scope: memories.scope,
  client: memories.client,
  createdAt: memories.createdAt,
  validUntil: memories.validUntil,
  rootId: memories.rootId,
  version: memories.version,
};

/**
 * Latest open "in progress" note. With a project: that project's note.
 * Without one: the newest open note across the user's projects (chat apps don't know the repo).
 */
export async function getHandoff(params: Owner & { scope?: string; project?: string }): Promise<HandoffNote | null> {
  const scope = normalizeScope(params.scope);
  const project = normalizeProjectName(params.project);
  const conditions = handoffScopeConditions(params, scope, project, !project);
  const [row] = await db
    .select(handoffColumns)
    .from(memories)
    .where(and(...conditions, sql`(${memories.validUntil} IS NULL OR ${memories.validUntil} > NOW())`))
    .orderBy(desc(memories.createdAt))
    .limit(1);
  return row ? toHandoffNote(row) : null;
}

/** One open note per (user, workspace, scope, project). A new note replaces the old one (history kept). */
export async function setHandoff(
  params: Owner & {
    content?: string;
    done?: boolean;
    scope?: string;
    project?: string;
    client?: string;
    source: MemorySource;
  },
): Promise<SetHandoffResponse> {
  const scope = normalizeScope(params.scope);
  const project = normalizeProjectName(params.project);
  // Serialize writers for this note so concurrent saves cannot fork the chain.
  const lockKey = `handoff:${params.workspaceId}:${params.userId}:${scope ?? ""}:${project ?? ""}`;
  const lockedCurrent = async (tx: Pick<typeof db, "select" | "execute">) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
    const [row] = await tx
      .select(handoffColumns)
      .from(memories)
      .where(and(...handoffScopeConditions(params, scope, project)))
      .orderBy(desc(memories.createdAt))
      .limit(1);
    return row;
  };

  if (params.done) {
    const closed = await db.transaction(async (tx) => {
      const current = await lockedCurrent(tx);
      if (!current) return null;
      // Expire instead of deleting so the chain (and its single memory slot) is reused next time.
      // DB clock, so the expiry check (valid_until > NOW()) is consistent immediately.
      await tx.update(memories).set({ validUntil: sql`NOW() - INTERVAL '1 second'` }).where(eq(memories.id, current.id));
      return current.id;
    });
    if (!closed) return { status: "none", handoff: null };
    await invalidateCachedProfile(params.userId, params.workspaceId, scope, project).catch(() => {});
    logger.info({ userId: params.userId, project, handoffId: closed }, "handoff closed");
    return { status: "closed", handoff: null };
  }

  // Redact before shortening so a cut cannot split a secret or a <private> span.
  const { text: redactedText, count: redacted } = redactSecrets((params.content ?? "").trim());
  const content = redactedText.slice(0, MAX_HANDOFF_CHARS);
  if (!content || (redacted > 0 && isOnlySecret(content))) {
    return { status: "none", handoff: null, ...(redacted ? { redacted } : {}) };
  }

  const embedding = await generateEmbedding(content);
  const validUntil = new Date(Date.now() + HANDOFF_TTL_DAYS * 86_400_000);
  const values = {
    userId: params.userId,
    workspaceId: params.workspaceId,
    scope,
    project,
    memoryType: "member",
    kind: "handoff",
    content,
    embedding,
    category: "context",
    source: params.source,
    client: params.client ?? null,
    validFrom: new Date(),
    validUntil,
  };

  const result = await db.transaction(async (tx) => {
    const current = await lockedCurrent(tx);
    if (!current) {
      const limit = await checkMemoryLimit(params.userId, { incrementBy: 1, tx, workspaceId: params.workspaceId });
      if (!limit.allowed) return null;
    }
    const [row] = await tx
      .insert(memories)
      .values(
        current
          ? { ...values, supersedesId: current.id, rootId: current.rootId ?? current.id, version: current.version + 1 }
          : values,
      )
      .returning(handoffColumns);
    if (current) {
      await tx.update(memories).set({ isCurrent: false }).where(eq(memories.id, current.id));
    } else {
      await incrementMemoryCount(params.userId, tx, params.workspaceId);
    }
    return { row, replacedId: current?.id };
  });

  if (!result) {
    throw new Error("Memory limit exceeded");
  }
  await invalidateCachedProfile(params.userId, params.workspaceId, scope, project).catch(() => {});
  logger.info({ userId: params.userId, project, handoffId: result.row.id, replaced: result.replacedId }, "handoff saved");
  return {
    status: result.replacedId ? "updated" : "saved",
    handoff: toHandoffNote(result.row),
    ...(redacted ? { redacted } : {}),
  };
}

const toLine = (m: MemoryWithRelevance): ContextLine => ({
  content: m.content,
  createdAt: m.createdAt,
  client: m.client,
  project: m.project,
  previous: m.previous,
});

/** Ready-to-inject context: open handoff, preferences, then memories relevant to the query. */
export async function buildMemoryContext(
  params: Owner & { query?: string; project?: string; scope?: string; maxTokens?: number },
): Promise<MemoryContextResponse> {
  const scope = normalizeScope(params.scope);
  const project = normalizeProjectName(params.project);
  const maxTokens = params.maxTokens ?? DEFAULT_CONTEXT_TOKENS;

  const [handoff, preferenceRows, relevant] = await Promise.all([
    getHandoff({ ...params, scope, project }),
    db
      .select({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        project: memories.project,
        client: memories.client,
        createdAt: memories.createdAt,
      })
      .from(memories)
      .where(
        and(
          eq(memories.workspaceId, params.workspaceId),
          eq(memories.userId, params.userId),
          isNull(memories.vaultId),
          eq(memories.memoryType, "member"),
          eq(memories.isCurrent, true),
          isNull(memories.deletedAt),
          eq(memories.category, "preference"),
          scope ? eq(memories.scope, scope) : isNull(memories.scope),
          project ? or(isNull(memories.project), eq(memories.project, project)) : undefined,
          sql`(${memories.validUntil} IS NULL OR ${memories.validUntil} > NOW())`,
        ),
      )
      .orderBy(desc(memories.createdAt))
      .limit(6),
    params.query
      ? searchMemories({
          userId: params.userId,
          workspaceId: params.workspaceId,
          visibleUserId: params.userId,
          query: params.query,
          limit: 8,
          scope,
        }).then((r) => r.memories)
      : recentMemories({ ...params, scope }),
  ]);

  const preferences: MemoryWithRelevance[] = preferenceRows.map((r) => ({
    id: r.id,
    content: r.content,
    category: "preference",
    ...(r.project ? { project: r.project } : {}),
    ...(r.client ? { client: r.client } : {}),
    relevance: 1,
    createdAt: r.createdAt,
  }));
  const shown = new Set([handoff?.id, ...preferences.map((p) => p.id)]);
  const memoriesOut = relevant.filter((m) => !shown.has(m.id) && m.kind !== "handoff");

  const rendered = renderContext(
    [
      { title: "In progress", lines: handoff ? [{ content: handoff.content, createdAt: handoff.createdAt, client: handoff.client }] : [] },
      { title: "About the user", lines: preferences.map(toLine) },
      { title: params.query ? "Relevant memory" : "Recent memory", lines: memoriesOut.map(toLine) },
    ],
    maxTokens,
  );
  return { text: rendered.text, tokens: rendered.tokens, handoff, preferences, memories: memoriesOut };
}

async function recentMemories(params: Owner & { scope?: string }): Promise<MemoryWithRelevance[]> {
  const rows = await db
    .select({
      id: memories.id,
      content: memories.content,
      category: memories.category,
      project: memories.project,
      client: memories.client,
      kind: memories.kind,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.workspaceId, params.workspaceId),
        eq(memories.userId, params.userId),
        isNull(memories.vaultId),
        eq(memories.memoryType, "member"),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
        or(isNull(memories.category), ne(memories.category, "preference")),
        sql`${memories.kind} IS DISTINCT FROM 'handoff'`,
        params.scope ? eq(memories.scope, params.scope) : isNull(memories.scope),
        sql`(${memories.validUntil} IS NULL OR ${memories.validUntil} > NOW())`,
      ),
    )
    .orderBy(desc(memories.createdAt))
    .limit(8);
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    category: (r.category ?? undefined) as MemoryWithRelevance["category"],
    ...(r.project ? { project: r.project } : {}),
    ...(r.client ? { client: r.client } : {}),
    ...(r.kind === "handoff" ? { kind: "handoff" as const } : {}),
    relevance: 1,
    createdAt: r.createdAt,
  }));
}

/** Queue a chat transcript for background extraction. Re-sending the same transcript is a no-op. */
export async function ingestTranscript(
  params: Owner & {
    sessionId: string;
    messages: TranscriptMessage[];
    client?: string;
    project?: string;
    scope?: string;
    date?: string;
    final?: boolean;
    source: MemorySource;
    maxChunks?: number;
  },
): Promise<Omit<IngestTranscriptResponse, "handoff">> {
  const { chunks, redacted } = chunkTranscript(params.messages, { final: params.final ?? true });
  const scope = normalizeScope(params.scope) ?? "";
  const project = normalizeProjectName(params.project) ?? "";
  const hashes = chunks.map((chunk) =>
    createHash("sha256")
      .update([params.workspaceId, params.userId, scope, project, params.sessionId, chunk].join("\u0000"))
      .digest("hex"),
  );
  const maxChunks = params.maxChunks ?? MAX_INGEST_CHUNKS;

  const existing = hashes.length
    ? await db
        .select({ contentHash: memorySources.contentHash })
        .from(memorySources)
        .where(
          and(
            eq(memorySources.workspaceId, params.workspaceId),
            eq(memorySources.userId, params.userId),
            inArray(memorySources.contentHash, hashes),
            ne(memorySources.status, "failed"),
          ),
        )
    : [];
  const seen = new Set(existing.map((row) => row.contentHash));

  const jobIds: string[] = [];
  let skipped = 0;
  let deferred = 0;
  let limitExceeded = false;
  for (let i = 0; i < chunks.length; i++) {
    if (seen.has(hashes[i])) {
      skipped++;
      continue;
    }
    if (limitExceeded || jobIds.length >= maxChunks) {
      deferred++;
      continue;
    }
    seen.add(hashes[i]);
    try {
      const result = await enqueueTranscriptChunk({
        userId: params.userId,
        workspaceId: params.workspaceId,
        content: chunks[i],
        sessionId: params.sessionId,
        contentHash: hashes[i],
        client: params.client,
        scope: params.scope,
        project: params.project,
        date: params.date,
        source: params.source,
      });
      if (result.status === "limit_exceeded") {
        limitExceeded = true;
        deferred++;
        continue;
      }
      if ("jobId" in result && result.jobId) jobIds.push(result.jobId);
    } catch (error) {
      // A concurrent request queued the same chunk first (unique content_hash index).
      if ((error as { code?: string; cause?: { code?: string } }).code === "23505" ||
        (error as { cause?: { code?: string } }).cause?.code === "23505") {
        skipped++;
        continue;
      }
      throw error;
    }
  }

  logger.info(
    { userId: params.userId, sessionId: params.sessionId, chunks: chunks.length, accepted: jobIds.length, skipped, deferred, redacted },
    "transcript ingested",
  );
  return {
    accepted: jobIds.length,
    skipped,
    jobIds,
    redacted,
    ...(deferred ? { deferred } : {}),
    ...(limitExceeded ? { limitExceeded } : {}),
  };
}

export const MAX_IMPORT_CONVERSATIONS = 200;

/** Import a ChatGPT or Claude `conversations.json` (newest first, capped). */
export async function importConversations(
  params: Owner & {
    format: "chatgpt" | "claude" | "auto";
    conversations: unknown[];
    project?: string;
    scope?: string;
    limit?: number;
    source: MemorySource;
  },
): Promise<ImportConversationsResponse> {
  const format = params.format === "auto" ? detectExportFormat(params.conversations) : params.format;
  if (!format) throw new Error("Unrecognized export format");
  const parsed = (format === "chatgpt" ? parseChatGPTExport : parseClaudeExport)(params.conversations)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, Math.min(params.limit ?? 50, MAX_IMPORT_CONVERSATIONS))
    // The worker is FIFO: queue oldest first so newer facts supersede older ones.
    .reverse();

  let accepted = 0;
  let skipped = 0;
  let deferred = 0;
  let redacted = 0;
  let limitExceeded = false;
  for (const conversation of parsed) {
    // Shared chunk budget across the whole import; anything over it is reported as deferred.
    const r = await ingestTranscript({
      userId: params.userId,
      workspaceId: params.workspaceId,
      sessionId: `import:${format}:${conversation.id}`,
      messages: conversation.messages,
      client: format,
      project: params.project,
      scope: params.scope,
      // Start of the chat; later days are marked per line by chunkTranscript.
      date: (conversation.messages[0]?.at ?? conversation.date)?.slice(0, 10),
      final: true,
      source: params.source,
      maxChunks: limitExceeded ? 0 : MAX_IMPORT_CHUNKS - accepted,
    });
    accepted += r.accepted;
    skipped += r.skipped;
    deferred += r.deferred ?? 0;
    redacted += r.redacted;
    if (r.limitExceeded) limitExceeded = true;
  }
  return {
    format,
    conversations: parsed.length,
    accepted,
    skipped,
    redacted,
    ...(deferred ? { deferred } : {}),
    ...(limitExceeded ? { limitExceeded } : {}),
  };
}
