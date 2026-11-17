import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import {
  eitherAuthMiddleware,
  type EitherAuthContext,
} from "../middleware/either-auth.js";
import {
  rateLimitFeedback,
  rateLimitSaveMemory,
  rateLimitSearchMemory,
} from "../middleware/rate-limit.js";
import {
  getMemory,
  getMemoryGraph,
  getMemoryHistory,
  getMemoryProfile,
  submitFeedback,
  saveMemory,
  searchMemories,
  deleteMemory,
  deleteMemories,
  updateMemory,
  listMemories,
} from "../services/memory.js";
import {
  checkMemoryLimit,
  getSubscriptionData,
} from "../services/subscription.js";
import {
  cacheProfile,
  getCachedProfile,
  invalidateCachedProfile,
  updateCachedMemoryCount,
} from "../services/cache.js";
import { getTimingContext } from "../middleware/request-logger.js";
import { logger } from "../lib/logger.js";
import type {
  FeedbackType,
  MemoryCategory,
  MemorySource,
} from "@memcontext/types";
import type { TimingContext } from "../utils/timing.js";
import { requireWorkspaceMember } from "../services/workspace.js";
import {
  buildMemoryContext,
  getHandoff,
  importConversations,
  ingestTranscript,
  MAX_IMPORT_CONVERSATIONS,
  normalizeClient,
  setHandoff,
} from "../services/memory-context.js";
import { isHandoffContent } from "../lib/memory-context.js";

const app = new Hono<{
  Variables: {
    auth: EitherAuthContext;
    timing: TimingContext;
  };
}>();

// === Schemas ===

const saveMemorySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(10000, "Content too long (max 10000 chars)"),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  project: z.string().max(100, "Project name too long").optional(),
  source: z.enum(["mcp", "web", "api", "openclaw"]).optional().default("api"),
  client: z.string().trim().max(80).optional(),
  validUntil: z.string().datetime().optional(),
  workspaceId: z.string().uuid().optional(),
});

const contextQuerySchema = z.object({
  query: z.string().trim().max(1000).optional(),
  project: z.string().max(100).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  maxTokens: z.coerce.number().int().min(100).max(4000).optional(),
  workspaceId: z.string().uuid().optional(),
});

const handoffQuerySchema = z.object({
  project: z.string().max(100).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  workspaceId: z.string().uuid().optional(),
});

const setHandoffSchema = z
  .object({
    content: z.string().trim().min(1).max(4000).optional(),
    done: z.boolean().optional(),
    project: z.string().max(100).optional(),
    scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
    client: z.string().trim().max(80).optional(),
    workspaceId: z.string().uuid().optional(),
  })
  .refine((v) => v.done || v.content, { message: "Provide content or done: true" });

const transcriptMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]),
  content: z.string().max(100_000),
  at: z.string().optional(),
});

const ingestTranscriptSchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  messages: z.array(transcriptMessageSchema).min(1).max(1000),
  client: z.string().trim().max(80).optional(),
  project: z.string().max(100).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/, "date must be YYYY-MM-DD or ISO 8601")
    .optional(),
  final: z.boolean().optional(),
  handoff: z
    .object({ content: z.string().trim().min(1).max(4000).optional(), done: z.boolean().optional() })
    .optional(),
  workspaceId: z.string().uuid().optional(),
});

const importConversationsSchema = z.object({
  format: z.enum(["chatgpt", "claude", "auto"]).default("auto"),
  conversations: z.array(z.unknown()).min(1).max(5000),
  project: z.string().max(100).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  limit: z.coerce.number().int().min(1).max(MAX_IMPORT_CONVERSATIONS).optional(),
  workspaceId: z.string().uuid().optional(),
});

/** App name from the body, the MemContext client header, or (MCP) the forwarded clientInfo. */
function resolveClient(c: { req: { header: (name: string) => string | undefined } }, bodyClient?: string) {
  return normalizeClient(bodyClient ?? c.req.header("X-MemContext-Client"));
}

const searchMemorySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Query is required")
    .max(1000, "Query too long (max 1000 chars)"),
  limit: z.coerce.number().min(1).max(10).optional().default(5),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  project: z.string().max(100, "Project name too long").optional(),
  threshold: z.coerce.number().min(0).max(1).optional(),
  workspaceId: z.string().uuid().optional(),
});

const listMemorySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(25),
  offset: z.coerce.number().min(0).optional().default(0),
  category: z.string().max(200).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  project: z.string().max(500).optional(),
  search: z.string().max(200, "Search query too long").optional(),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
  workspaceId: z.string().uuid().optional(),
});

const bulkDeleteMemorySchema = z.object({
  ids: z
    .array(z.string().uuid("Invalid memory ID format"))
    .min(1, "At least one memory ID is required")
    .max(100, "Cannot delete more than 100 memories at once"),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  workspaceId: z.string().uuid().optional(),
});

const updateMemorySchema = z.object({
  content: z.string().trim().min(1).max(10000).optional(),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().max(100).optional(),
});

const scopedQuerySchema = z.object({
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  workspaceId: z.string().uuid().optional(),
});

const profileQuerySchema = z.object({
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  project: z.string().max(100, "Project name too long").optional(),
  workspaceId: z.string().uuid().optional(),
});

const memoryIdParamSchema = z.object({
  id: z.string().uuid("Invalid memory ID format"),
});

const feedbackSchema = z.object({
  type: z.enum(["helpful", "not_helpful", "outdated", "wrong"]),
  context: z.string().max(1000, "Feedback context too long").optional(),
});

async function resolveMemoryWorkspace(
  auth: EitherAuthContext,
  requestedWorkspaceId?: string,
) {
  if (auth.authType !== "session") {
    if (requestedWorkspaceId && requestedWorkspaceId !== auth.workspaceId) {
      throw new HTTPException(403, {
        message: "API key is not authorized for this workspace",
      });
    }
    return auth.workspaceId;
  }

  const workspaceId = requestedWorkspaceId ?? auth.workspaceId;
  await requireWorkspaceMember(auth.userId, workspaceId);
  return workspaceId;
}

async function resolveMemoryVisibility(
  auth: EitherAuthContext,
  _workspaceId: string,
) {
  return auth.userId;
}

async function resolveWritableMemoryWorkspace(
  auth: EitherAuthContext,
  requestedWorkspaceId?: string,
) {
  const workspaceId = await resolveMemoryWorkspace(auth, requestedWorkspaceId);
  const membership = await requireWorkspaceMember(auth.userId, workspaceId);
  if (membership.role === "viewer") {
    throw new HTTPException(403, { message: "Viewers cannot modify memories" });
  }
  return workspaceId;
}

// === Shared Routes (API Key OR Session) ===

// POST / - Save memory (MCP + Dashboard)
app.post(
  "/",
  eitherAuthMiddleware,
  zValidator("json", saveMemorySchema),
  rateLimitSaveMemory,
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const timing = getTimingContext(c);
    const workspaceId = await resolveWritableMemoryWorkspace(auth, body.workspaceId);
    const client = resolveClient(c, body.client);

    // "In progress: …" notes become the project's single, replaceable handoff note.
    // Runs before the early limit check: replacing an existing note uses no new slot.
    if (isHandoffContent(body.content) && !body.validUntil) {
      const handoff = await saveHandoffOr403({
        userId: auth.userId,
        workspaceId,
        content: body.content,
        scope: body.scope,
        project: body.project,
        client,
        source: body.source as MemorySource,
      });
      if (handoff.status === "none") {
        return c.json(
          { id: "", status: "skipped", message: "Not saved: the note was empty or only a secret.", redacted: handoff.redacted ?? 0 },
          200,
        );
      }
      return c.json(
        {
          id: handoff.handoff?.id,
          status: handoff.status === "updated" ? "updated" : "saved",
          kind: "handoff",
          ...(handoff.redacted ? { redacted: handoff.redacted } : {}),
        },
        201,
      );
    }

    // Early limit check - saves LLM/embedding costs when user is already at limit
    const limitCheck = await checkMemoryLimit(auth.userId, {
      workspaceId,
    });
    if (!limitCheck.allowed) {
      throw new HTTPException(403, {
        message: `Memory limit exceeded. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}. Upgrade your plan at https://app.memcontext.in/settings`,
      });
    }

    const result = await saveMemory({
      userId: auth.userId,
      workspaceId,
      content: body.content,
      category: body.category as MemoryCategory | undefined,
      scope: body.scope,
      project: body.project,
      source: body.source as MemorySource,
      client,
      timing,
      validUntil: body.validUntil,
    });

    if (result.status === "skipped") {
      return c.json(result, 200);
    }

    // Transaction-level check handles race condition edge case (e.g., 299/300 + concurrent requests)
    if (result.status === "limit_exceeded") {
      throw new HTTPException(403, {
        message: `Memory limit exceeded. Current: ${result.current}, Limit: ${result.limit}. Upgrade your plan at https://app.memcontext.in/settings`,
      });
    }

    // Update cache if API key auth and memory count changed
    if (
      auth.authType === "api_key" &&
      auth.keyHash &&
      (result.status === "saved" || result.status === "extended")
    ) {
      try {
        const sub = await getSubscriptionData(auth.userId, workspaceId);
        await updateCachedMemoryCount(auth.keyHash, sub.memoryCount);
      } catch (err) {
        logger.error(
          {
            userId: auth.userId,
            errorMessage: err instanceof Error ? err.message : String(err),
          },
          "failed to update cached memory count",
        );
      }
    }

    if (
      result.status === "saved" ||
      result.status === "updated" ||
      result.status === "extended"
    ) {
      const persistedMemory = await getMemory(
        auth.userId,
        result.id!,
        body.scope,
        workspaceId,
      );
      await invalidateCachedProfile(
        auth.userId,
        workspaceId,
        persistedMemory?.scope ?? body.scope,
        persistedMemory?.project ?? body.project,
      ).catch(() => {});
      await invalidateCachedProfile(auth.userId, workspaceId, body.scope).catch(() => {});
    }

    return c.json(result, result.status === "accepted" ? 202 : 201);
  },
);

// GET /search - Search memories (MCP + Dashboard)
app.get(
  "/search",
  eitherAuthMiddleware,
  zValidator("query", searchMemorySchema),
  rateLimitSearchMemory,
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");
    const timing = getTimingContext(c);
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);

    const result = await searchMemories({
      userId: auth.userId,
      workspaceId,
      visibleUserId,
      query: query.query,
      limit: query.limit,
      category: query.category as MemoryCategory | undefined,
      scope: query.scope,
      project: query.project,
      timing,
      threshold: query.threshold,
    });

    return c.json(result);
  },
);

async function saveHandoffOr403(params: Parameters<typeof setHandoff>[0]) {
  try {
    return await setHandoff(params);
  } catch (error) {
    if (error instanceof Error && error.message === "Memory limit exceeded") {
      throw new HTTPException(403, {
        message: "Memory limit exceeded. Upgrade your plan at https://app.memcontext.in/settings",
      });
    }
    throw error;
  }
}

// GET /context - Ready-to-inject context for plugins, hooks and chat apps
app.get(
  "/context",
  eitherAuthMiddleware,
  zValidator("query", contextQuerySchema),
  rateLimitSearchMemory,
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const result = await buildMemoryContext({
      userId: auth.userId,
      workspaceId,
      query: query.query || undefined,
      project: query.project,
      scope: query.scope,
      maxTokens: query.maxTokens,
    });
    return c.json(result);
  },
);

// GET /handoff - Latest open "in progress" note (any project when none is given)
app.get(
  "/handoff",
  eitherAuthMiddleware,
  zValidator("query", handoffQuerySchema),
  rateLimitSearchMemory,
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const handoff = await getHandoff({
      userId: auth.userId,
      workspaceId,
      project: query.project,
      scope: query.scope,
    });
    return c.json({ handoff });
  },
);

// PUT /handoff - Replace the project's in-progress note, or close it with done: true
app.put(
  "/handoff",
  eitherAuthMiddleware,
  zValidator("json", setHandoffSchema),
  rateLimitSaveMemory,
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const workspaceId = await resolveWritableMemoryWorkspace(auth, body.workspaceId);
    const result = await saveHandoffOr403({
      userId: auth.userId,
      workspaceId,
      content: body.content,
      done: body.done,
      project: body.project,
      scope: body.scope,
      client: resolveClient(c, body.client),
      source: auth.authType === "session" ? "web" : "api",
    });
    return c.json(result);
  },
);

// POST /ingest - Queue a chat transcript (hooks, plugins, importers). Idempotent per sessionId.
app.post(
  "/ingest",
  eitherAuthMiddleware,
  zValidator("json", ingestTranscriptSchema),
  rateLimitSaveMemory,
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const workspaceId = await resolveWritableMemoryWorkspace(auth, body.workspaceId);
    const client = resolveClient(c, body.client);
    const source: MemorySource = auth.authType === "session" ? "web" : "api";
    const result = await ingestTranscript({
      userId: auth.userId,
      workspaceId,
      sessionId: body.sessionId,
      messages: body.messages,
      client,
      project: body.project,
      scope: body.scope,
      date: body.date,
      final: body.final,
      source,
    });
    if (result.limitExceeded && result.accepted === 0) {
      throw new HTTPException(403, {
        message: "Memory limit exceeded. Upgrade your plan at https://app.memcontext.in/settings",
      });
    }
    const handoff =
      body.handoff && (body.handoff.content || body.handoff.done)
        ? await saveHandoffOr403({
            userId: auth.userId,
            workspaceId,
            content: body.handoff.content,
            done: body.handoff.done,
            project: body.project,
            scope: body.scope,
            client,
            source,
          })
        : undefined;
    return c.json({ ...result, ...(handoff ? { handoff } : {}) }, 202);
  },
);

// POST /import - Import a ChatGPT or Claude conversations.json export
app.post(
  "/import",
  eitherAuthMiddleware,
  zValidator("json", importConversationsSchema),
  rateLimitSaveMemory,
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const workspaceId = await resolveWritableMemoryWorkspace(auth, body.workspaceId);
    try {
      const result = await importConversations({
        userId: auth.userId,
        workspaceId,
        format: body.format,
        conversations: body.conversations,
        project: body.project,
        scope: body.scope,
        limit: body.limit,
        source: auth.authType === "session" ? "web" : "api",
      });
      if (result.limitExceeded && result.accepted === 0) {
        throw new HTTPException(403, {
          message: "Memory limit exceeded. Upgrade your plan at https://app.memcontext.in/settings",
        });
      }
      return c.json(result, 202);
    } catch (error) {
      if (error instanceof Error && error.message === "Unrecognized export format") {
        throw new HTTPException(400, {
          message: "Unrecognized export. Upload conversations.json from a ChatGPT or Claude data export.",
        });
      }
      throw error;
    }
  },
);

// GET /profile - Pre-aggregated user context
app.get(
  "/profile",
  eitherAuthMiddleware,
  zValidator("query", profileQuerySchema),
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);

    const cached = await getCachedProfile(
      auth.userId,
      workspaceId,
      query.scope,
      query.project,
      visibleUserId,
    );
    if (cached) {
      return c.json(cached);
    }

    const profile = await getMemoryProfile(
      auth.userId,
      workspaceId,
      query.project,
      query.scope,
      visibleUserId,
    );
    await cacheProfile(
      auth.userId,
      workspaceId,
      query.scope,
      query.project,
      visibleUserId,
      profile,
    );
    return c.json(profile);
  },
);

// GET /graph - Memory graph data for dashboard visualization
app.get(
  "/graph",
  eitherAuthMiddleware,
  zValidator("query", scopedQuerySchema),
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);
    const graph = await getMemoryGraph(
      auth.userId,
      workspaceId,
      query.scope,
      visibleUserId,
    );
    return c.json(graph);
  },
);

// GET / - List memories
app.get(
  "/",
  eitherAuthMiddleware,
  zValidator("query", listMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);

    const validCategories = new Set([
      "preference",
      "fact",
      "decision",
      "context",
    ]);
    const rawCategories = query.category
      ? query.category
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const invalidCategories = rawCategories.filter(
      (category) => !validCategories.has(category),
    );

    if (invalidCategories.length > 0) {
      throw new HTTPException(400, {
        message: `Invalid category filter: ${invalidCategories.join(", ")}`,
      });
    }

    const categories = rawCategories.length
      ? (rawCategories as MemoryCategory[])
      : undefined;

    const projects = query.project
      ? query.project
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;

    const result = await listMemories({
      userId: auth.userId,
      workspaceId,
      visibleUserId,
      limit: query.limit,
      offset: query.offset,
      categories: categories?.length ? categories : undefined,
      scope: query.scope,
      projects: projects?.length ? projects : undefined,
      search: query.search,
      sort: query.sort,
    });

    return c.json(result);
  },
);

// GET /:id/history - Get memory version history
app.get(
  "/:id/history",
  eitherAuthMiddleware,
  zValidator("param", memoryIdParamSchema),
  zValidator("query", scopedQuerySchema),
  async (c) => {
    const auth = c.get("auth");
    const { id: memoryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);

    const result = await getMemoryHistory(
      auth.userId,
      workspaceId,
      memoryId,
      query.scope,
      visibleUserId,
    );
    if (!result) {
      throw new HTTPException(404, { message: "Memory not found" });
    }

    return c.json(result);
  },
);

// POST /:id/feedback - Submit feedback for a memory
app.post(
  "/:id/feedback",
  eitherAuthMiddleware,
  zValidator("param", memoryIdParamSchema),
  zValidator("query", scopedQuerySchema),
  zValidator("json", feedbackSchema),
  rateLimitFeedback,
  async (c) => {
    const auth = c.get("auth");
    const { id: memoryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const body = c.req.valid("json");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);

    try {
      const result = await submitFeedback(
        auth.userId,
        workspaceId,
        memoryId,
        body.type as FeedbackType,
        body.context,
        query.scope,
        visibleUserId,
      );
      return c.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "Memory not found") {
        throw new HTTPException(404, { message: error.message });
      }
      throw error;
    }
  },
);

// POST /:id/forget - Soft-delete a memory
app.post(
  "/:id/forget",
  eitherAuthMiddleware,
  zValidator("param", memoryIdParamSchema),
  zValidator("query", scopedQuerySchema),
  async (c) => {
    const auth = c.get("auth");
    const { id: memoryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const workspaceId = await resolveWritableMemoryWorkspace(
      auth,
      query.workspaceId,
    );
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);
    const existing = await getMemory(
      auth.userId,
      memoryId,
      query.scope,
      workspaceId,
      visibleUserId,
    );

    const deleted = await deleteMemory(
      auth.userId,
      workspaceId,
      memoryId,
      query.scope,
    );

    if (!deleted) {
      throw new HTTPException(404, { message: "Memory not found" });
    }

    await Promise.all([
      invalidateCachedProfile(auth.userId, workspaceId, existing?.scope),
      invalidateCachedProfile(
        auth.userId,
        workspaceId,
        existing?.scope,
        existing?.project,
      ),
    ]).catch(() => {});

    if (auth.authType === "api_key" && auth.keyHash) {
      try {
        const sub = await getSubscriptionData(auth.userId, workspaceId);
        await updateCachedMemoryCount(auth.keyHash, sub.memoryCount);
      } catch (err) {
        logger.error(
          {
            userId: auth.userId,
            errorMessage: err instanceof Error ? err.message : String(err),
          },
          "failed to update cached memory count after forget",
        );
      }
    }

    return c.json({ success: true, message: "Memory forgotten" });
  },
);

// GET /:id - Get a single memory
app.get(
  "/:id",
  eitherAuthMiddleware,
  zValidator("param", memoryIdParamSchema),
  zValidator("query", scopedQuerySchema),
  async (c) => {
    const auth = c.get("auth");
    const { id: memoryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const workspaceId = await resolveMemoryWorkspace(auth, query.workspaceId);
    const visibleUserId = await resolveMemoryVisibility(auth, workspaceId);

    const memory = await getMemory(
      auth.userId,
      memoryId,
      query.scope,
      workspaceId,
      visibleUserId,
    );
    if (!memory) {
      throw new HTTPException(404, { message: "Memory not found" });
    }

    return c.json(memory);
  },
);

// PATCH /:id - Update memory
app.patch(
  "/:id",
  eitherAuthMiddleware,
  zValidator("param", memoryIdParamSchema),
  zValidator("query", scopedQuerySchema),
  zValidator("json", updateMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const { id: memoryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const body = c.req.valid("json");
    const timing = getTimingContext(c);
    const workspaceId = await resolveWritableMemoryWorkspace(
      auth,
      query.workspaceId,
    );
    const existing = await getMemory(
      auth.userId,
      memoryId,
      query.scope,
      workspaceId,
    );

    const result = await updateMemory({
      userId: auth.userId,
      workspaceId,
      memoryId,
      content: body.content,
      category: body.category as MemoryCategory | undefined,
      scope: query.scope,
      project: body.project,
      timing,
    });

    if (!result.success) {
      throw new HTTPException(result.error === "Memory not found" ? 404 : 400, {
        message: result.error ?? "Failed to update memory",
      });
    }

    await Promise.all([
      invalidateCachedProfile(auth.userId, workspaceId, existing?.scope),
      invalidateCachedProfile(
        auth.userId,
        workspaceId,
        existing?.scope,
        existing?.project,
      ),
      invalidateCachedProfile(auth.userId, workspaceId, existing?.scope, body.project),
    ]).catch(() => {});

    return c.json(result);
  },
);

// DELETE /bulk - Delete multiple memories (max 100)
app.delete(
  "/bulk",
  eitherAuthMiddleware,
  zValidator("json", bulkDeleteMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const workspaceId = await resolveWritableMemoryWorkspace(auth, body.workspaceId);

    const result = await deleteMemories(
      auth.userId,
      workspaceId,
      body.ids,
      body.scope,
    );

    const invalidations = result.affectedMemories.flatMap((memory) => [
      invalidateCachedProfile(
        auth.userId,
        workspaceId,
        memory.scope ?? undefined,
      ),
      invalidateCachedProfile(
        auth.userId,
        workspaceId,
        memory.scope ?? undefined,
        memory.project ?? undefined,
      ),
    ]);
    await Promise.all(invalidations).catch(() => {});

    if (auth.authType === "api_key" && auth.keyHash) {
      try {
        const sub = await getSubscriptionData(auth.userId, workspaceId);
        await updateCachedMemoryCount(auth.keyHash, sub.memoryCount);
      } catch (err) {
        logger.error(
          {
            userId: auth.userId,
            errorMessage: err instanceof Error ? err.message : String(err),
          },
          "failed to update cached memory count after bulk delete",
        );
      }
    }

    return c.json({ success: true, deletedCount: result.deletedCount });
  },
);

// DELETE /:id - Delete memory
app.delete(
  "/:id",
  eitherAuthMiddleware,
  zValidator("param", memoryIdParamSchema),
  zValidator("query", scopedQuerySchema),
  async (c) => {
    const auth = c.get("auth");
    const { id: memoryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const workspaceId = await resolveWritableMemoryWorkspace(
      auth,
      query.workspaceId,
    );
    const existing = await getMemory(
      auth.userId,
      memoryId,
      query.scope,
      workspaceId,
    );

    const deleted = await deleteMemory(
      auth.userId,
      workspaceId,
      memoryId,
      query.scope,
    );

    if (!deleted) {
      throw new HTTPException(404, { message: "Memory not found" });
    }

    await Promise.all([
      invalidateCachedProfile(auth.userId, workspaceId, existing?.scope),
      invalidateCachedProfile(
        auth.userId,
        workspaceId,
        existing?.scope,
        existing?.project,
      ),
    ]).catch(() => {});

    if (auth.authType === "api_key" && auth.keyHash) {
      try {
        const sub = await getSubscriptionData(auth.userId, workspaceId);
        await updateCachedMemoryCount(auth.keyHash, sub.memoryCount);
      } catch (err) {
        logger.error(
          {
            userId: auth.userId,
            errorMessage: err instanceof Error ? err.message : String(err),
          },
          "failed to update cached memory count after delete",
        );
      }
    }

    return c.json({ success: true });
  },
);

export default app;
