import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import {
  db,
  memories,
  memoryEvidence,
  memoryFeedback,
  memoryRelations,
  memorySourceChunks,
  memorySources,
} from "../db/index.js";
import { normalizeProjectName, normalizeScope } from "../utils/index.js";
import {
  extractAtomicMemories,
  generateEmbedding,
  generateQueryVariants,
} from "./embedding.js";
import { rerankDocuments } from "../lib/openrouter.js";
import { saveExtractedDocumentMemory, searchMemories } from "./memory.js";
import { requireWorkspaceMember } from "./workspace.js";
import { checkContextDocumentLimit } from "./subscription.js";
import { scrapeUrlWithExa } from "./exa.js";
import { extractDocumentWithOcr } from "./ocr.js";
import { deleteDocumentObject } from "./document-storage.js";
import { logger } from "../lib/logger.js";
import type { FeedbackType, MemoryCategory } from "@memcontext/types";
import type { MemorySourceRow } from "../db/index.js";

const NO_PROJECT_FILTER_VALUE = "__memcontext_no_project__";
const CHUNK_TARGET_TOKENS = 650;
const CHUNK_OVERLAP_TOKENS = 90;
const CHUNK_MAX_CHARS = 6_000;
const CHUNK_CHAR_OVERLAP = 600;
const SEMANTIC_CHUNK_MIN_CHARS = 350;
const SEMANTIC_CHUNK_SOFT_CHARS = 2_200;
const SEMANTIC_CHUNK_HARD_CHARS = 4_500;
const COMPANY_BRAIN_PARSER_VERSION = "company-brain-v1";
const COMPANY_BRAIN_CHUNKER_VERSION = "structure-v2";
const COMPANY_BRAIN_EXTRACTOR_VERSION = "atomic-v1";
const MAX_DOCUMENT_CHARS = 250_000;
const DOCUMENT_SEARCH_THRESHOLD = 0.75;
const COMPANY_BRAIN_POLL_INTERVAL_MS = 2500;
// Context Vault document processing can legitimately run for several minutes,
// so stale-lock recovery should stay conservative to avoid reclaiming active
// jobs mid-flight.
const COMPANY_BRAIN_STALE_AFTER_MS = 20 * 60 * 1000;
const COMPANY_BRAIN_MAX_ATTEMPTS = 3;
const COMPANY_BRAIN_RERANK_CANDIDATES = 30;
const COMPANY_BRAIN_DOC_TYPES = [
  "pdf",
  "markdown",
  "text",
  "docx",
  "html",
  "url",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "tiff",
] as const;

type DocumentSourceType =
  | "pdf"
  | "markdown"
  | "text"
  | "docx"
  | "html"
  | "url"
  | "csv"
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "tiff";
type SearchMode = "memories" | "documents" | "hybrid";

interface IngestDocumentParams {
  userId: string;
  workspaceId: string;
  title: string;
  content?: string;
  sourceType: DocumentSourceType;
  scope?: string;
  project?: string;
  mimeType?: string;
  originalFilename?: string;
  uri?: string;
  storageKey?: string;
  publicUrl?: string | null;
  metadata?: Record<string, unknown>;
  category?: MemoryCategory;
  priorityPageLimit?: number;
}

type CompanyBrainPayload =
  | {
      ingestionKind: "content";
      content: string;
      contentLength: number;
      uri?: string | null;
      publicUrl?: string | null;
      [key: string]: unknown;
    }
  | {
      ingestionKind: "exa-url";
      uri: string;
      crawlSubpages: boolean;
      subpageTarget?: string[];
      priorityPageLimit?: number;
      publicUrl?: string | null;
      [key: string]: unknown;
    }
  | {
      ingestionKind: "stored-file";
      publicUrl: string;
      storageKey?: string;
      content?: string;
      contentLength?: number;
      [key: string]: unknown;
    };

interface CreateDocumentJobParams extends IngestDocumentParams {
  crawlSubpages?: boolean;
  subpageTarget?: string[];
}

interface SearchCompanyBrainParams {
  userId: string;
  workspaceId: string;
  query: string;
  mode: SearchMode;
  scope?: string;
  scopes?: string[];
  project?: string;
  limit: number;
}

interface CorrectCompanyBrainMemoryParams {
  userId: string;
  workspaceId: string;
  memoryId: string;
  type: "wrong" | "outdated" | "incomplete";
  correctedContent: string;
  reason?: string;
  correctedChunkContent?: string;
  evidenceChunkId?: string;
}

interface ParsedBlock {
  text: string;
  sectionPath: string;
  pageNumber?: number;
  startOffset: number;
  endOffset: number;
}

interface ChunkSearchRow {
  id: string;
  sourceId: string;
  content: string;
  contextualContent: string;
  sectionPath: string | null;
  scope: string | null;
  project: string | null;
  chunkIndex: number;
  createdAt: Date;
  title: string | null;
  sourceType: string;
}

interface CompanyBrainChunkResult {
  id: string;
  sourceId: string;
  title: string | null;
  sourceType: string;
  sectionPath: string | null;
  scope: string | null;
  project: string | null;
  chunkIndex: number;
  content: string;
  contextualContent: string;
  relevance: number;
  createdAt: Date;
}

interface PersistedDocumentChunk {
  id: string;
  content: string;
  metadata: unknown;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function estimateTokens(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.25);
}

function normalizeText(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function decodeHtmlEntities(content: string): string {
  return content
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function stripHtml(content: string): string {
  return decodeHtmlEntities(content)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\b(class|aria-label|data-[a-z-]+|href|src|id)="[^"]*"/gi, " ")
    .replace(/\bd="[^"]*"/gi, " ")
    .replace(/\/_next\/static\/\S+/g, " ")
    .replace(/\/mintlify-assets\/\S+/g, " ");
}

function isTableSeparator(line: string) {
  return /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(line);
}

function isTableRow(line: string) {
  return line.includes("|") && line.trim().split("|").length >= 3;
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function tableRowsToBlocks(
  rows: string[],
  sectionPath: string,
  startOffset: number,
  endOffset: number,
): ParsedBlock[] {
  if (rows.length < 2 || !isTableSeparator(rows[1])) {
    return [{ text: rows.join("\n"), sectionPath, startOffset, endOffset }];
  }

  const headers = splitTableRow(rows[0]);
  const dataRows = rows.slice(2).filter(isTableRow);
  if (headers.length === 0 || dataRows.length === 0) {
    return [{ text: rows.join("\n"), sectionPath, startOffset, endOffset }];
  }

  return dataRows.map((row, index) => {
    const cells = splitTableRow(row);
    const labeledCells = headers.map((header, cellIndex) => {
      const value = cells[cellIndex] ?? "";
      return `${header}: ${value}`;
    });
    return {
      text: labeledCells.join("\n"),
      sectionPath: `${sectionPath} > Table row ${index + 1}`,
      startOffset,
      endOffset,
    };
  });
}

function parseBlocks(
  content: string,
  sourceType: DocumentSourceType,
): ParsedBlock[] {
  const text = normalizeText(
    sourceType === "html" || sourceType === "url"
      ? stripHtml(content)
      : content,
  );

  if (sourceType === "pdf" && text.includes("\f")) {
    let offset = 0;
    return text.split("\f").flatMap((page, index) => {
      const pageText = page.trim();
      const block = pageText
        ? [
            {
              text: pageText,
              sectionPath: `Page ${index + 1}`,
              pageNumber: index + 1,
              startOffset: offset,
              endOffset: offset + page.length,
            },
          ]
        : [];
      offset += page.length + 1;
      return block;
    });
  }

  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];
  const headerStack: string[] = [];
  let buffer: string[] = [];
  let startOffset = 0;
  let cursor = 0;
  let inFence = false;

  function currentSectionPath() {
    return headerStack.length ? headerStack.join(" > ") : "Document";
  }

  function flush(endOffset: number) {
    const blockText = buffer.join("\n").trim();
    if (blockText) {
      blocks.push({
        text: blockText,
        sectionPath: currentSectionPath(),
        startOffset,
        endOffset,
      });
    }
    buffer = [];
  }

  function flushTable(endOffset: number) {
    if (buffer.length === 0) return;
    blocks.push(
      ...tableRowsToBlocks(
        buffer,
        currentSectionPath(),
        startOffset,
        endOffset,
      ),
    );
    buffer = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const isFence = trimmed.startsWith("```") || trimmed.startsWith("~~~");
    const isListLine = /^([-*+]|\d+\.)\s+/.test(trimmed);
    const bufferingTable = buffer.length > 0 && buffer.every(isTableRow);

    if (isFence) {
      if (buffer.length === 0) startOffset = cursor;
      buffer.push(line);
      inFence = !inFence;
    } else if (!inFence && heading) {
      flush(cursor);
      const level = heading[1].length;
      headerStack.splice(level - 1);
      headerStack[level - 1] = heading[2].trim();
      startOffset = cursor + line.length + 1;
    } else if (!inFence && isTableRow(line)) {
      if (bufferingTable || buffer.length === 0) {
        if (buffer.length === 0) startOffset = cursor;
        buffer.push(line);
      } else {
        flush(cursor);
        startOffset = cursor;
        buffer.push(line);
      }
    } else if (!inFence && bufferingTable) {
      flushTable(cursor);
      if (trimmed) {
        startOffset = cursor;
        buffer.push(line);
      }
    } else if (!inFence && trimmed === "") {
      flush(cursor);
      startOffset = cursor + line.length + 1;
    } else if (
      !inFence &&
      !isListLine &&
      buffer.some((entry) => /^([-*+]|\d+\.)\s+/.test(entry.trim()))
    ) {
      flush(cursor);
      startOffset = cursor;
      buffer.push(line);
    } else {
      if (buffer.length === 0) startOffset = cursor;
      buffer.push(line);
    }
    cursor += line.length + 1;
  }

  if (buffer.length > 0 && buffer.every(isTableRow)) {
    flushTable(text.length);
  } else {
    flush(text.length);
  }
  return blocks.length
    ? blocks
    : [
        {
          text,
          sectionPath: "Document",
          startOffset: 0,
          endOffset: text.length,
        },
      ];
}

function isIgnorableBlock(text: string) {
  const trimmed = text.trim();
  return /^[-*_]{3,}$/.test(trimmed) || /^notes:\s*$/i.test(trimmed);
}

function normalizeMergeSection(sectionPath: string) {
  return sectionPath.replace(/\s+>\s+Table row \d+$/i, "");
}

function startsQuestionBlock(text: string) {
  return /^Q\d+\s*[.—:-]/i.test(text.trim());
}

function containsQuestionBlock(text: string) {
  return /(^|\n\n)Q\d+\s*[.—:-]/i.test(text.trim());
}

function isContinuationBlock(text: string) {
  return /^(listen for|notes):/i.test(text.trim());
}

function mergeSemanticBlocks(blocks: ParsedBlock[]): ParsedBlock[] {
  const merged: ParsedBlock[] = [];
  let current: ParsedBlock | null = null;

  function flush() {
    if (current) {
      merged.push(current);
      current = null;
    }
  }

  for (const block of blocks) {
    const text = normalizeText(block.text);
    if (!text || isIgnorableBlock(text)) continue;

    const candidate: ParsedBlock = {
      ...block,
      text,
      sectionPath: normalizeMergeSection(block.sectionPath),
    };

    if (!current) {
      current = candidate;
      continue;
    }

    const sameSection =
      current.sectionPath === candidate.sectionPath &&
      current.pageNumber === candidate.pageNumber;
    const nextLength = current.text.length + candidate.text.length + 2;
    const shouldStartNewQuestion =
      startsQuestionBlock(candidate.text) &&
      (containsQuestionBlock(current.text) ||
        current.text.length >= SEMANTIC_CHUNK_MIN_CHARS);
    const shouldFlush =
      !sameSection ||
      nextLength > SEMANTIC_CHUNK_HARD_CHARS ||
      shouldStartNewQuestion ||
      (current.text.length >= SEMANTIC_CHUNK_SOFT_CHARS &&
        !isContinuationBlock(candidate.text));

    if (shouldFlush) {
      flush();
      current = candidate;
      continue;
    }

    current = {
      ...current,
      text: `${current.text}\n\n${candidate.text}`,
      endOffset: candidate.endOffset,
    };
  }

  flush();
  return merged.length ? merged : blocks;
}

function chunkBlock(block: ParsedBlock) {
  const words = block.text.split(/\s+/).filter(Boolean);
  const targetWords = Math.floor(CHUNK_TARGET_TOKENS / 1.25);
  const overlapWords = Math.floor(CHUNK_OVERLAP_TOKENS / 1.25);
  const chunks: Array<Omit<ParsedBlock, "endOffset"> & { endOffset: number }> =
    [];

  function pushBoundedChunk(text: string) {
    if (text.length <= CHUNK_MAX_CHARS) {
      chunks.push({
        ...block,
        text,
        startOffset: block.startOffset,
        endOffset: block.endOffset,
      });
      return;
    }

    for (
      let start = 0;
      start < text.length;
      start += CHUNK_MAX_CHARS - CHUNK_CHAR_OVERLAP
    ) {
      const slice = text.slice(start, start + CHUNK_MAX_CHARS).trim();
      if (!slice) continue;
      chunks.push({
        ...block,
        text: slice,
        startOffset: block.startOffset,
        endOffset: block.endOffset,
      });
      if (start + CHUNK_MAX_CHARS >= text.length) break;
    }
  }

  for (
    let start = 0;
    start < words.length;
    start += targetWords - overlapWords
  ) {
    const selected = words.slice(start, start + targetWords);
    if (selected.length === 0) break;
    pushBoundedChunk(selected.join(" "));
    if (start + targetWords >= words.length) break;
  }

  return chunks;
}

function buildContextualContent(title: string, chunk: ParsedBlock): string {
  return [
    `Document: ${title}`,
    `Section: ${chunk.sectionPath}`,
    chunk.pageNumber ? `Page: ${chunk.pageNumber}` : undefined,
    "",
    chunk.text,
  ]
    .filter((value) => value !== undefined)
    .join("\n");
}

class CompanyBrainCancelledError extends Error {
  constructor() {
    super("Document processing was cancelled");
  }
}

const COMPANY_BRAIN_PROCESSOR_CONCURRENCY = 2;

let companyBrainProcessorStarted = false;
let companyBrainProcessorActiveCount = 0;

function buildQueuedPayload(
  params: CreateDocumentJobParams,
): CompanyBrainPayload {
  const metadata = params.metadata ?? {};

  if (params.content) {
    const normalizedContent = normalizeText(params.content);
    if (normalizedContent.length > MAX_DOCUMENT_CHARS) {
      throw new Error("Document content is too large for JSON ingestion");
    }
    return {
      ingestionKind: "content",
      content: normalizedContent,
      contentLength: normalizedContent.length,
      uri: params.uri ?? null,
      publicUrl: params.publicUrl ?? null,
      ...metadata,
    };
  }

  if (params.sourceType === "url" && params.uri) {
    return {
      ingestionKind: "exa-url",
      uri: params.uri,
      crawlSubpages: params.crawlSubpages ?? true,
      subpageTarget: params.subpageTarget,
      priorityPageLimit: params.priorityPageLimit,
      publicUrl: params.publicUrl ?? params.uri,
      ...metadata,
    };
  }

  if (params.publicUrl) {
    return {
      ingestionKind: "stored-file",
      publicUrl: params.publicUrl,
      storageKey: params.storageKey,
      ...metadata,
    };
  }

  throw new Error("Document content, URL, or stored file URL is required");
}

function getPayloadPublicUrl(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return null;
  return "publicUrl" in payload ? (payload.publicUrl as string | null) : null;
}

function getChunkExtractionCompleted(metadata: unknown) {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "extractionStatus" in metadata &&
    metadata.extractionStatus === "completed"
  );
}

function getExtractionLimitPerChunk(payload: CompanyBrainPayload) {
  if (
    payload.ingestionKind === "exa-url" &&
    payload.scraper === "exa" &&
    payload.crawlMode === "docs-priority"
  ) {
    return 3;
  }

  return 6;
}

function mergeChunkMetadata(
  metadata: unknown,
  updates: Record<string, unknown>,
) {
  return {
    ...(typeof metadata === "object" && metadata !== null ? metadata : {}),
    ...updates,
  };
}

function toCompanyBrainDocument(source: {
  id: string;
  title: string | null;
  sourceType: string;
  status: string;
  chunkCount: number | null;
  extractedCount: number | null;
  totalChunks?: number | null;
  processedChunks?: number | null;
  processingPhase?: string | null;
  heartbeatAt?: Date | null;
  scope: string | null;
  project: string | null;
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
  payload?: unknown;
}) {
  return {
    id: source.id,
    title: source.title,
    sourceType: source.sourceType,
    status: source.status,
    chunkCount: source.chunkCount ?? 0,
    extractedCount: source.extractedCount ?? 0,
    totalChunks: source.totalChunks ?? source.chunkCount ?? 0,
    processedChunks: source.processedChunks ?? source.chunkCount ?? 0,
    processingPhase: source.processingPhase,
    heartbeatAt: source.heartbeatAt,
    scope: source.scope,
    project: source.project,
    createdAt: source.createdAt,
    completedAt: source.completedAt,
    error: source.error,
    publicUrl: getPayloadPublicUrl(source.payload),
  };
}

function getRetryDelayMs(attempts: number) {
  return Math.min(60_000, 10_000 * 2 ** Math.max(0, attempts - 1));
}

function isRetryableCompanyBrainError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return ![
    "Document content is too large",
    "Document content, URL, or stored file URL is required",
    "Unsupported context vault payload",
    "Document processing was cancelled",
  ].some((nonRetryable) => message.includes(nonRetryable));
}

async function updateCompanyBrainProgress(
  sourceId: string,
  updates: {
    processingPhase?: string | null;
    totalChunks?: number;
    processedChunks?: number;
    chunkCount?: number;
    extractedCount?: number;
  },
) {
  await db
    .update(memorySources)
    .set({
      ...updates,
      heartbeatAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(memorySources.id, sourceId));
}

async function softDeleteExclusiveDocumentMemoriesForSource(params: {
  sourceId: string;
  workspaceId: string;
}) {
  const evidenceRows = await db
    .select({ memoryId: memoryEvidence.memoryId })
    .from(memoryEvidence)
    .innerJoin(memorySources, eq(memoryEvidence.sourceId, memorySources.id))
    .where(
      and(
        eq(memoryEvidence.sourceId, params.sourceId),
        eq(memorySources.workspaceId, params.workspaceId),
      ),
    );
  const memoryIds = Array.from(
    new Set(evidenceRows.map((row) => row.memoryId)),
  );

  if (memoryIds.length === 0) {
    return 0;
  }

  const sharedRows = await db
    .select({ memoryId: memoryEvidence.memoryId })
    .from(memoryEvidence)
    .innerJoin(memorySources, eq(memoryEvidence.sourceId, memorySources.id))
    .where(
      and(
        inArray(memoryEvidence.memoryId, memoryIds),
        eq(memorySources.workspaceId, params.workspaceId),
        sql`${memoryEvidence.sourceId} <> ${params.sourceId}`,
      ),
    );
  const sharedMemoryIds = new Set(sharedRows.map((row) => row.memoryId));
  const exclusiveMemoryIds = memoryIds.filter(
    (memoryId) => !sharedMemoryIds.has(memoryId),
  );

  if (exclusiveMemoryIds.length === 0) {
    return 0;
  }

  await db
    .delete(memoryRelations)
    .where(
      and(
        eq(memoryRelations.workspaceId, params.workspaceId),
        or(
          inArray(memoryRelations.sourceId, exclusiveMemoryIds),
          inArray(memoryRelations.targetId, exclusiveMemoryIds),
        ),
      ),
    );
  await db
    .update(memories)
    .set({ deletedAt: sql`NOW()` })
    .where(
      and(
        inArray(memories.id, exclusiveMemoryIds),
        eq(memories.workspaceId, params.workspaceId),
        eq(memories.memoryType, "document"),
        isNull(memories.deletedAt),
      ),
    );

  return exclusiveMemoryIds.length;
}

async function assertCompanyBrainNotCancelled(sourceId: string) {
  const [row] = await db
    .select({ status: memorySources.status })
    .from(memorySources)
    .where(eq(memorySources.id, sourceId))
    .limit(1);

  if (row?.status === "cancelled") {
    throw new CompanyBrainCancelledError();
  }
}

export async function ingestCompanyBrainDocument(
  params: CreateDocumentJobParams,
) {
  const membership = await requireWorkspaceMember(
    params.userId,
    params.workspaceId,
  );
  if (membership.role === "viewer") {
    throw new Error("Viewers cannot ingest workspace documents");
  }
  const limitCheck = await checkContextDocumentLimit(params.userId, {
    workspaceId: params.workspaceId,
  });
  if (!limitCheck.allowed) {
    throw new Error(
      `Context Vault document limit exceeded. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}. Upgrade your plan to ingest more documents.`,
    );
  }

  const scope = normalizeScope(params.scope);
  const noProject = params.project === NO_PROJECT_FILTER_VALUE;
  const project = noProject ? undefined : normalizeProjectName(params.project);
  const payload = buildQueuedPayload(params);
  const contentHash =
    payload.ingestionKind === "content"
      ? hashContent(payload.content)
      : undefined;
  const [source] = await db
    .insert(memorySources)
    .values({
      userId: params.userId,
      workspaceId: params.workspaceId,
      scope,
      project,
      category: params.category,
      source: "api",
      sourceType: params.sourceType,
      status: "pending",
      title: params.title,
      originalFilename: params.originalFilename,
      mimeType: params.mimeType,
      storageKey: params.storageKey,
      contentHash,
      parserVersion: COMPANY_BRAIN_PARSER_VERSION,
      chunkerVersion: COMPANY_BRAIN_CHUNKER_VERSION,
      extractorVersion: COMPANY_BRAIN_EXTRACTOR_VERSION,
      payload,
      processingPhase: "queued",
      totalChunks: 0,
      processedChunks: 0,
      heartbeatAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!source) {
    throw new Error("Failed to create document processing job");
  }

  kickCompanyBrainProcessor();

  return {
    document: toCompanyBrainDocument(source),
    chunkCount: 0,
    extractedCount: 0,
    status: "accepted",
    message: "Document accepted for background processing.",
  };
}

async function resolveCompanyBrainContent(source: MemorySourceRow) {
  const payload = source.payload as CompanyBrainPayload;

  if (payload.ingestionKind === "content") {
    return {
      content: payload.content,
      publicUrl: payload.publicUrl ?? null,
      metadata: payload,
    };
  }

  if (payload.ingestionKind === "exa-url") {
    const scraped = await scrapeUrlWithExa({
      url: payload.uri,
      crawlSubpages: payload.crawlSubpages,
      subpageTarget: payload.subpageTarget,
      priorityPageLimit: payload.priorityPageLimit,
    });

    return {
      content: scraped.content,
      publicUrl: scraped.resolvedUrl,
      metadata: {
        ...payload,
        scraper: "exa",
        exaRequestId: scraped.requestId,
        crawlMode: scraped.crawlMode,
        pageCount: scraped.pageCount,
        discoveredPageCount: scraped.discoveredPageCount,
        selectedPageCount: scraped.selectedPageCount,
        failedPageCount: scraped.failedPageCount,
        selectedPages: scraped.selectedPages,
        statuses: scraped.statuses,
      },
    };
  }

  if (payload.ingestionKind === "stored-file") {
    if (payload.content) {
      return {
        content: normalizeText(payload.content),
        publicUrl: payload.publicUrl,
        metadata: payload,
      };
    }

    const result = await extractDocumentWithOcr({
      mimeType: source.mimeType ?? "application/octet-stream",
      publicUrl: payload.publicUrl,
    });

    return {
      content: result.markdown,
      publicUrl: payload.publicUrl,
      metadata: {
        ...payload,
        ocrProvider: "mistral",
      },
    };
  }

  throw new Error("Unsupported context vault payload");
}

async function processCompanyBrainSource(source: MemorySourceRow) {
  try {
    if (!source.workspaceId) {
      throw new Error("Workspace document source is missing workspace ID");
    }

    await updateCompanyBrainProgress(source.id, {
      processingPhase: "resolving_source",
    });
    await assertCompanyBrainNotCancelled(source.id);
    const resolved = await resolveCompanyBrainContent(source);
    await assertCompanyBrainNotCancelled(source.id);

    const normalizedContent = normalizeText(resolved.content);
    if (normalizedContent.length > MAX_DOCUMENT_CHARS) {
      throw new Error("Document content is too large for JSON ingestion");
    }

    const title = source.title ?? "Untitled document";
    const sourceType = source.sourceType as DocumentSourceType;
    const scope = source.scope ?? undefined;
    const project = source.project ?? undefined;
    const extractionLimitPerChunk = getExtractionLimitPerChunk(
      resolved.metadata as CompanyBrainPayload,
    );
    const normalizedContentHash = hashContent(normalizedContent);
    const contentChanged =
      !!source.contentHash && source.contentHash !== normalizedContentHash;
    const chunkerChanged =
      source.chunkerVersion !== COMPANY_BRAIN_CHUNKER_VERSION;

    if (contentChanged || chunkerChanged) {
      await softDeleteExclusiveDocumentMemoriesForSource({
        sourceId: source.id,
        workspaceId: source.workspaceId,
      });
      await db
        .delete(memorySourceChunks)
        .where(eq(memorySourceChunks.sourceId, source.id));
    }

    await db
      .update(memorySources)
      .set({
        contentHash: normalizedContentHash,
        payload: {
          ...resolved.metadata,
          contentLength: normalizedContent.length,
          publicUrl: resolved.publicUrl,
        },
        processingPhase: "chunking",
        chunkerVersion: COMPANY_BRAIN_CHUNKER_VERSION,
        extractorVersion: COMPANY_BRAIN_EXTRACTOR_VERSION,
        heartbeatAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memorySources.id, source.id));

    const blockChunks = mergeSemanticBlocks(
      parseBlocks(normalizedContent, sourceType),
    ).flatMap(chunkBlock);
    await updateCompanyBrainProgress(source.id, {
      processingPhase: "embedding_chunks",
      totalChunks: blockChunks.length,
      processedChunks: 0,
    });

    const persistedChunks: PersistedDocumentChunk[] = [];

    for (const [index, chunk] of blockChunks.entries()) {
      await assertCompanyBrainNotCancelled(source.id);
      const contextualContent = buildContextualContent(title, chunk);
      const chunkHash = hashContent(chunk.text);
      const [existingChunk] = await db
        .select({
          id: memorySourceChunks.id,
          content: memorySourceChunks.content,
          contentHash: memorySourceChunks.contentHash,
          metadata: memorySourceChunks.metadata,
        })
        .from(memorySourceChunks)
        .where(
          and(
            eq(memorySourceChunks.sourceId, source.id),
            eq(memorySourceChunks.chunkIndex, index),
          ),
        )
        .limit(1);

      if (existingChunk?.contentHash === chunkHash) {
        persistedChunks.push(existingChunk);
        await updateCompanyBrainProgress(source.id, {
          chunkCount: persistedChunks.length,
          processedChunks: persistedChunks.length,
        });
        continue;
      }

      if (existingChunk) {
        await db
          .delete(memorySourceChunks)
          .where(eq(memorySourceChunks.id, existingChunk.id));
      }

      const embedding = await generateEmbedding(contextualContent);
      await assertCompanyBrainNotCancelled(source.id);
      const [persistedChunk] = await db
        .insert(memorySourceChunks)
        .values({
          sourceId: source.id,
          userId: source.userId,
          workspaceId: source.workspaceId,
          scope,
          project,
          chunkIndex: index,
          parentIndex: blockChunks.findIndex(
            (candidate) => candidate.sectionPath === chunk.sectionPath,
          ),
          content: chunk.text,
          contextualContent,
          embedding,
          tokenCount: estimateTokens(chunk.text),
          contentHash: chunkHash,
          sectionPath: chunk.sectionPath,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          metadata: {},
        })
        .returning();
      if (!persistedChunk) {
        throw new Error("Failed to persist document chunk");
      }
      persistedChunks.push(persistedChunk);
      await updateCompanyBrainProgress(source.id, {
        chunkCount: persistedChunks.length,
        processedChunks: persistedChunks.length,
      });
    }

    await assertCompanyBrainNotCancelled(source.id);
    await updateCompanyBrainProgress(source.id, {
      processingPhase: "extracting_memories",
      totalChunks: blockChunks.length,
      processedChunks: persistedChunks.length,
    });

    let extractedCount = 0;

    for (const [index, chunk] of persistedChunks.entries()) {
      await assertCompanyBrainNotCancelled(source.id);
      if (getChunkExtractionCompleted(chunk.metadata)) {
        const [{ count = 0 } = { count: 0 }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(memoryEvidence)
          .where(eq(memoryEvidence.chunkId, chunk.id));
        extractedCount += count;
        await updateCompanyBrainProgress(source.id, { extractedCount });
        continue;
      }

      const parsedChunk = blockChunks[index];
      const extractionInput = parsedChunk
        ? buildContextualContent(title, parsedChunk)
        : chunk.content;
      const extractedCandidates = (await extractAtomicMemories(extractionInput))
        .slice(0, extractionLimitPerChunk)
        .filter(Boolean);

      for (const fact of extractedCandidates) {
        await assertCompanyBrainNotCancelled(source.id);
        const saveResult = await saveExtractedDocumentMemory({
          userId: source.userId,
          workspaceId: source.workspaceId,
          content: fact,
          category: (source.category as MemoryCategory | null) ?? "fact",
          scope,
          project,
        });
        await assertCompanyBrainNotCancelled(source.id);
        const memoryId = saveResult.id ?? saveResult.existingId;
        if (memoryId) {
          await db
            .insert(memoryEvidence)
            .values({
              memoryId,
              sourceId: source.id,
              chunkId: chunk.id,
              userId: source.userId,
              workspaceId: source.workspaceId,
              scope,
              quote: chunk.content.slice(0, 1000),
              confidence: 0.7,
              metadata: { extraction: "chunk-level" },
            })
            .onConflictDoNothing();
        }
      }

      const [{ count: chunkExtractedCount = 0 } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(memoryEvidence)
        .where(eq(memoryEvidence.chunkId, chunk.id));
      extractedCount += chunkExtractedCount;
      const completedMetadata = mergeChunkMetadata(chunk.metadata, {
        extractionStatus: "completed",
        extractedCount: chunkExtractedCount,
        extractedAt: new Date().toISOString(),
      });
      await db
        .update(memorySourceChunks)
        .set({ metadata: completedMetadata })
        .where(eq(memorySourceChunks.id, chunk.id));
      chunk.metadata = completedMetadata;
      await updateCompanyBrainProgress(source.id, { extractedCount });
    }

    const [updatedSource] = await db
      .update(memorySources)
      .set({
        status: "completed",
        chunkCount: persistedChunks.length,
        extractedCount,
        totalChunks: blockChunks.length,
        processedChunks: persistedChunks.length,
        processingPhase: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
        error: null,
        lockedAt: null,
        heartbeatAt: new Date(),
        nextRunAt: null,
      })
      .where(eq(memorySources.id, source.id))
      .returning();

    if (!updatedSource) {
      throw new Error("Failed to complete document processing job");
    }

    return {
      document: updatedSource,
      chunkCount: persistedChunks.length,
      extractedCount,
    };
  } catch (error) {
    if (error instanceof CompanyBrainCancelledError) {
      return;
    }
    throw error;
  }
}

async function claimNextCompanyBrainSource() {
  const staleBefore = new Date(Date.now() - COMPANY_BRAIN_STALE_AFTER_MS);
  const now = new Date();
  const [candidate] = await db
    .select({ id: memorySources.id })
    .from(memorySources)
    .where(
      and(
        sql`${memorySources.workspaceId} IS NOT NULL`,
        inArray(memorySources.sourceType, [...COMPANY_BRAIN_DOC_TYPES]),
        or(
          eq(memorySources.status, "pending"),
          and(
            eq(memorySources.status, "retrying"),
            or(
              isNull(memorySources.nextRunAt),
              sql`${memorySources.nextRunAt} <= ${now}`,
            ),
          ),
          and(
            eq(memorySources.status, "processing"),
            or(
              lt(memorySources.heartbeatAt, staleBefore),
              and(
                isNull(memorySources.heartbeatAt),
                lt(memorySources.updatedAt, staleBefore),
              ),
            ),
          ),
        ),
      ),
    )
    .orderBy(asc(memorySources.createdAt))
    .limit(1);

  if (!candidate) return null;

  const [claimed] = await db
    .update(memorySources)
    .set({
      status: "processing",
      attempts: sql`${memorySources.attempts} + 1`,
      lockedAt: now,
      heartbeatAt: now,
      startedAt: now,
      updatedAt: now,
      error: null,
    })
    .where(
      and(
        eq(memorySources.id, candidate.id),
        or(
          eq(memorySources.status, "pending"),
          eq(memorySources.status, "retrying"),
          and(
            eq(memorySources.status, "processing"),
            or(
              lt(memorySources.heartbeatAt, staleBefore),
              and(
                isNull(memorySources.heartbeatAt),
                lt(memorySources.updatedAt, staleBefore),
              ),
            ),
          ),
        ),
      ),
    )
    .returning();

  return claimed ?? null;
}

async function markCompanyBrainFailure(
  source: MemorySourceRow,
  error: unknown,
) {
  const attempts = source.attempts;
  const retryable =
    attempts < COMPANY_BRAIN_MAX_ATTEMPTS &&
    isRetryableCompanyBrainError(error);
  const message = error instanceof Error ? error.message : String(error);
  const nextRunAt = retryable
    ? new Date(Date.now() + getRetryDelayMs(attempts))
    : null;

  await db
    .update(memorySources)
    .set({
      status: retryable ? "retrying" : "failed",
      error: message,
      lockedAt: null,
      heartbeatAt: null,
      nextRunAt,
      completedAt: retryable ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(memorySources.id, source.id));

  logger.warn(
    {
      memorySourceId: source.id,
      workspaceId: source.workspaceId,
      attempts,
      retryable,
      nextRunAt,
      errorMessage: message,
    },
    "context vault document processing failed",
  );
}

async function runCompanyBrainProcessorWorker() {
  companyBrainProcessorActiveCount += 1;
  try {
    while (true) {
      const source = await claimNextCompanyBrainSource();
      if (!source) break;

      try {
        await processCompanyBrainSource(source);
      } catch (error) {
        await markCompanyBrainFailure(source, error);
      }
    }
  } finally {
    companyBrainProcessorActiveCount -= 1;
  }
}

async function drainPendingCompanyBrainSources() {
  const availableSlots =
    COMPANY_BRAIN_PROCESSOR_CONCURRENCY - companyBrainProcessorActiveCount;
  if (availableSlots <= 0) return;

  await Promise.all(
    Array.from({ length: availableSlots }, () =>
      runCompanyBrainProcessorWorker(),
    ),
  );
}

function scheduleDrainCompanyBrainSources() {
  void drainPendingCompanyBrainSources().catch((error) => {
    logger.error(
      { errorMessage: error instanceof Error ? error.message : String(error) },
      "context vault processor loop failed",
    );
  });
}

function kickCompanyBrainProcessor() {
  if (companyBrainProcessorStarted) {
    scheduleDrainCompanyBrainSources();
  }
}

export function startCompanyBrainProcessor() {
  if (companyBrainProcessorStarted) return;

  companyBrainProcessorStarted = true;
  const timer = setInterval(() => {
    scheduleDrainCompanyBrainSources();
  }, COMPANY_BRAIN_POLL_INTERVAL_MS);
  timer.unref();
  scheduleDrainCompanyBrainSources();
}

export async function cancelCompanyBrainDocument(params: {
  userId: string;
  documentId: string;
}) {
  const [document] = await db
    .select()
    .from(memorySources)
    .where(eq(memorySources.id, params.documentId))
    .limit(1);

  if (!document?.workspaceId) {
    throw new Error("Document not found");
  }

  const membership = await requireWorkspaceMember(
    params.userId,
    document.workspaceId,
  );
  if (membership.role === "viewer") {
    throw new Error("Viewers cannot cancel workspace document processing");
  }

  const [updated] = await db
    .update(memorySources)
    .set({
      status: "cancelled",
      error: "Cancelled by user",
      lockedAt: null,
      heartbeatAt: null,
      nextRunAt: null,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(memorySources.id, params.documentId),
        inArray(memorySources.status, ["pending", "processing", "retrying"]),
      ),
    )
    .returning();

  return {
    cancelled: !!updated,
    documentId: params.documentId,
  };
}

export async function deleteCompanyBrainDocument(params: {
  userId: string;
  documentId: string;
}) {
  const [document] = await db
    .select()
    .from(memorySources)
    .where(eq(memorySources.id, params.documentId))
    .limit(1);

  if (!document?.workspaceId) {
    throw new Error("Document not found");
  }

  const membership = await requireWorkspaceMember(
    params.userId,
    document.workspaceId,
  );
  if (membership.role === "viewer") {
    throw new Error("Viewers cannot delete workspace documents");
  }
  const workspaceId = document.workspaceId;

  const result = await db.transaction(async (tx) => {
    const evidenceRows = await tx
      .select({ memoryId: memoryEvidence.memoryId })
      .from(memoryEvidence)
      .innerJoin(memorySources, eq(memoryEvidence.sourceId, memorySources.id))
      .where(
        and(
          eq(memoryEvidence.sourceId, params.documentId),
          eq(memorySources.workspaceId, workspaceId),
        ),
      );
    const memoryIds = Array.from(
      new Set(evidenceRows.map((row) => row.memoryId)),
    );

    const sharedRows =
      memoryIds.length === 0
        ? []
        : await tx
            .select({ memoryId: memoryEvidence.memoryId })
            .from(memoryEvidence)
            .innerJoin(
              memorySources,
              eq(memoryEvidence.sourceId, memorySources.id),
            )
            .where(
              and(
                inArray(memoryEvidence.memoryId, memoryIds),
                eq(memorySources.workspaceId, workspaceId),
                sql`${memoryEvidence.sourceId} <> ${params.documentId}`,
              ),
            );
    const sharedMemoryIds = new Set(sharedRows.map((row) => row.memoryId));
    const exclusiveMemoryIds = memoryIds.filter(
      (memoryId) => !sharedMemoryIds.has(memoryId),
    );

    if (exclusiveMemoryIds.length > 0) {
      await tx
        .delete(memoryRelations)
        .where(
          and(
            eq(memoryRelations.workspaceId, workspaceId),
            or(
              inArray(memoryRelations.sourceId, exclusiveMemoryIds),
              inArray(memoryRelations.targetId, exclusiveMemoryIds),
            ),
          ),
        );
      await tx
        .update(memories)
        .set({ deletedAt: sql`NOW()` })
        .where(
          and(
            inArray(memories.id, exclusiveMemoryIds),
            eq(memories.workspaceId, workspaceId),
            eq(memories.memoryType, "document"),
            isNull(memories.deletedAt),
          ),
        );
    }

    const [deletedDocument] = await tx
      .delete(memorySources)
      .where(eq(memorySources.id, params.documentId))
      .returning();

    if (!deletedDocument) {
      throw new Error("Document not found");
    }

    return {
      deletedDocument,
      deletedMemoryCount: exclusiveMemoryIds.length,
      preservedMemoryCount: sharedMemoryIds.size,
    };
  });

  if (document.storageKey) {
    deleteDocumentObject(document.storageKey).catch((error) => {
      logger.warn(
        {
          memorySourceId: document.id,
          storageKey: document.storageKey,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        "context vault document object delete failed",
      );
    });
  }

  return {
    deleted: true,
    documentId: params.documentId,
    deletedMemoryCount: result.deletedMemoryCount,
    preservedMemoryCount: result.preservedMemoryCount,
  };
}

export async function listCompanyBrainDocuments(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceMember(userId, workspaceId);

  const documents = await db
    .select({
      id: memorySources.id,
      title: memorySources.title,
      sourceType: memorySources.sourceType,
      status: memorySources.status,
      chunkCount: memorySources.chunkCount,
      extractedCount: memorySources.extractedCount,
      totalChunks: memorySources.totalChunks,
      processedChunks: memorySources.processedChunks,
      processingPhase: memorySources.processingPhase,
      heartbeatAt: memorySources.heartbeatAt,
      project: memorySources.project,
      scope: memorySources.scope,
      createdAt: memorySources.createdAt,
      completedAt: memorySources.completedAt,
      error: memorySources.error,
      payload: memorySources.payload,
    })
    .from(memorySources)
    .where(
      and(
        eq(memorySources.workspaceId, workspaceId),
        sql`${memorySources.sourceType} IN ('pdf', 'markdown', 'text', 'docx', 'html', 'url', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'tiff')`,
      ),
    )
    .orderBy(desc(memorySources.createdAt));

  return {
    documents: documents.map(toCompanyBrainDocument),
  };
}

interface ListCompanyBrainMemoriesParams {
  userId: string;
  workspaceId: string;
  scope?: string;
  project?: string;
  projects?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listCompanyBrainMemories(
  params: ListCompanyBrainMemoriesParams,
) {
  await requireWorkspaceMember(params.userId, params.workspaceId);

  const scope = normalizeScope(params.scope);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const offset = Math.max(params.offset ?? 0, 0);
  const search = params.search?.trim();

  // Support both a single `project` and a multi-value `projects[]` filter.
  const rawProjects =
    params.projects && params.projects.length > 0
      ? params.projects
      : params.project
        ? [params.project]
        : [];
  const includeNoProject = rawProjects.includes(NO_PROJECT_FILTER_VALUE);
  const namedProjects = rawProjects
    .filter((value) => value !== NO_PROJECT_FILTER_VALUE)
    .map((value) => normalizeProjectName(value))
    .filter((value): value is string => !!value);

  const conditions = [
    eq(memories.workspaceId, params.workspaceId),
    inArray(memories.memoryType, ["document", "company"]),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
  ];
  if (scope) conditions.push(eq(memories.scope, scope));

  if (includeNoProject && namedProjects.length === 0) {
    conditions.push(isNull(memories.project));
  } else if (!includeNoProject && namedProjects.length > 0) {
    conditions.push(inArray(memories.project, namedProjects));
  } else if (includeNoProject && namedProjects.length > 0) {
    conditions.push(
      or(isNull(memories.project), inArray(memories.project, namedProjects))!,
    );
  }

  if (search) {
    const escaped = search
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    conditions.push(ilike(memories.content, `%${escaped}%`));
  }

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        scope: memories.scope,
        project: memories.project,
        createdAt: memories.createdAt,
      })
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.createdAt), desc(memories.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memories)
      .where(and(...conditions)),
  ]);

  const total = countRows[0]?.count ?? 0;
  const sourceByMemory = await getMemorySourceMap(rows.map((row) => row.id));

  return {
    memories: rows.map((row) => {
      const source = sourceByMemory.get(row.id);
      return {
        ...row,
        sourceId: source?.sourceId ?? null,
        sourceTitle: source?.title ?? null,
        sourceUrl: source?.publicUrl ?? null,
      };
    }),
    total,
    hasMore: offset + rows.length < total,
  };
}

interface MemorySourceInfo {
  sourceId: string;
  title: string | null;
  publicUrl: string | null;
}

/**
 * Maps memory IDs to the document (memory source) they were extracted from,
 * via the `memory_evidence` table. A memory may have several evidence rows;
 * we keep the first source per memory.
 */
async function getMemorySourceMap(memoryIds: string[]) {
  const map = new Map<string, MemorySourceInfo>();
  if (memoryIds.length === 0) return map;

  const evidenceRows = await db
    .select({
      memoryId: memoryEvidence.memoryId,
      sourceId: memoryEvidence.sourceId,
      title: memorySources.title,
      payload: memorySources.payload,
    })
    .from(memoryEvidence)
    .innerJoin(memorySources, eq(memoryEvidence.sourceId, memorySources.id))
    .where(inArray(memoryEvidence.memoryId, memoryIds))
    // Deterministic: pick the earliest evidence row per memory.
    .orderBy(asc(memoryEvidence.createdAt), asc(memoryEvidence.id));

  for (const row of evidenceRows) {
    if (!map.has(row.memoryId)) {
      map.set(row.memoryId, {
        sourceId: row.sourceId,
        title: row.title,
        publicUrl: getPayloadPublicUrl(row.payload),
      });
    }
  }
  return map;
}

interface ListDocumentMemoriesParams {
  userId: string;
  workspaceId: string;
  documentId: string;
}

/**
 * Lists every memory extracted from a single document (memory source),
 * resolved through the `memory_evidence` linkage.
 */
export async function listCompanyBrainDocumentMemories(
  params: ListDocumentMemoriesParams,
) {
  await requireWorkspaceMember(params.userId, params.workspaceId);

  const [source] = await db
    .select({
      id: memorySources.id,
      title: memorySources.title,
      workspaceId: memorySources.workspaceId,
      payload: memorySources.payload,
    })
    .from(memorySources)
    .where(eq(memorySources.id, params.documentId))
    .limit(1);

  if (!source || source.workspaceId !== params.workspaceId) {
    throw new Error("Document not found");
  }

  const sourceUrl = getPayloadPublicUrl(source.payload);

  const rows = await db
    .selectDistinctOn([memories.id], {
      id: memories.id,
      content: memories.content,
      category: memories.category,
      scope: memories.scope,
      project: memories.project,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .innerJoin(memoryEvidence, eq(memoryEvidence.memoryId, memories.id))
    .where(
      and(
        eq(memoryEvidence.sourceId, params.documentId),
        // Defense-in-depth: keep results inside this workspace's vault.
        eq(memories.workspaceId, params.workspaceId),
        inArray(memories.memoryType, ["document", "company"]),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
      ),
    )
    .orderBy(memories.id);

  const sorted = [...rows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((row) => ({
      ...row,
      sourceId: source.id,
      sourceTitle: source.title,
      sourceUrl,
    }));

  return {
    document: { id: source.id, title: source.title, publicUrl: sourceUrl },
    memories: sorted,
    total: sorted.length,
  };
}

interface CompanyBrainFeedbackParams {
  userId: string;
  workspaceId: string;
  memoryId: string;
  type: FeedbackType;
  context?: string;
}

/**
 * Submits feedback on a workspace (vault) memory. Authorized to any workspace
 * member; the memory must belong to this workspace's vault.
 */
export async function submitCompanyBrainMemoryFeedback(
  params: CompanyBrainFeedbackParams,
) {
  await requireWorkspaceMember(params.userId, params.workspaceId);

  const [memory] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(
      and(
        eq(memories.id, params.memoryId),
        eq(memories.workspaceId, params.workspaceId),
        inArray(memories.memoryType, ["document", "company"]),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
      ),
    )
    .limit(1);

  if (!memory) {
    throw new Error("Memory not found");
  }

  await db.insert(memoryFeedback).values({
    memoryId: params.memoryId,
    userId: params.userId,
    type: params.type,
    context: params.context,
  });

  return { success: true };
}

export async function correctCompanyBrainMemory(
  params: CorrectCompanyBrainMemoryParams,
) {
  const membership = await requireWorkspaceMember(
    params.userId,
    params.workspaceId,
  );
  if (membership.role === "viewer") {
    throw new Error("Viewers cannot correct workspace memories");
  }

  const correctedContent = normalizeText(params.correctedContent);
  if (!correctedContent) {
    throw new Error("Corrected content is required");
  }

  const [memory] = await db
    .select({
      id: memories.id,
      category: memories.category,
      scope: memories.scope,
      project: memories.project,
    })
    .from(memories)
    .where(
      and(
        eq(memories.id, params.memoryId),
        eq(memories.workspaceId, params.workspaceId),
        inArray(memories.memoryType, ["document", "company"]),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
      ),
    )
    .limit(1);

  if (!memory) {
    throw new Error("Memory not found");
  }

  const feedbackType: FeedbackType =
    params.type === "outdated" ? "outdated" : "wrong";
  const correctedEmbedding = await generateEmbedding(correctedContent);
  const correctedChunkContent = params.correctedChunkContent
    ? normalizeText(params.correctedChunkContent)
    : undefined;
  const correctedChunkEmbedding = correctedChunkContent
    ? await generateEmbedding(correctedChunkContent)
    : undefined;

  const correctionMetadata = {
    correction: true,
    type: params.type,
    reason: params.reason,
    correctedContent,
    correctedChunkContent,
    evidenceChunkId: params.evidenceChunkId,
    correctedAt: new Date().toISOString(),
  };

  const result = await db.transaction(async (tx) => {
    const [updatedMemory] = await tx
      .update(memories)
      .set({
        content: correctedContent,
        embedding: correctedEmbedding,
      })
      .where(
        and(
          eq(memories.id, params.memoryId),
          eq(memories.workspaceId, params.workspaceId),
          inArray(memories.memoryType, ["document", "company"]),
          eq(memories.isCurrent, true),
          isNull(memories.deletedAt),
        ),
      )
      .returning({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        scope: memories.scope,
        project: memories.project,
        createdAt: memories.createdAt,
      });

    await tx
      .delete(memoryFeedback)
      .where(
        and(
          eq(memoryFeedback.memoryId, params.memoryId),
          inArray(memoryFeedback.type, ["wrong", "outdated", "not_helpful"]),
        ),
      );

    await tx.insert(memoryFeedback).values({
      memoryId: params.memoryId,
      userId: params.userId,
      type: feedbackType,
      context: JSON.stringify(correctionMetadata).slice(0, 4000),
    });

    let updatedChunkCount = 0;
    if (correctedChunkContent && correctedChunkEmbedding) {
      const evidenceConditions = [
        eq(memoryEvidence.memoryId, params.memoryId),
        eq(memorySources.workspaceId, params.workspaceId),
        eq(memorySourceChunks.workspaceId, params.workspaceId),
        eq(memorySourceChunks.sourceId, memoryEvidence.sourceId),
      ];
      if (params.evidenceChunkId) {
        evidenceConditions.push(
          eq(memorySourceChunks.id, params.evidenceChunkId),
        );
      }

      const chunks = await tx
        .select({
          id: memorySourceChunks.id,
          metadata: memorySourceChunks.metadata,
        })
        .from(memoryEvidence)
        .innerJoin(
          memorySourceChunks,
          eq(memoryEvidence.chunkId, memorySourceChunks.id),
        )
        .innerJoin(memorySources, eq(memoryEvidence.sourceId, memorySources.id))
        .where(and(...evidenceConditions));

      for (const chunk of chunks) {
        await tx
          .update(memorySourceChunks)
          .set({
            content: correctedChunkContent,
            contextualContent: correctedChunkContent,
            embedding: correctedChunkEmbedding,
            tokenCount: estimateTokens(correctedChunkContent),
            contentHash: hashContent(correctedChunkContent),
            metadata: mergeChunkMetadata(chunk.metadata, {
              correction: correctionMetadata,
            }),
          })
          .where(eq(memorySourceChunks.id, chunk.id));
      }

      const chunkIds = chunks.map((chunk) => chunk.id);
      if (chunkIds.length > 0) {
        await tx
          .update(memoryEvidence)
          .set({
            quote: correctedChunkContent.slice(0, 1000),
            confidence: 1,
          })
          .where(
            and(
              eq(memoryEvidence.memoryId, params.memoryId),
              inArray(memoryEvidence.chunkId, chunkIds),
            ),
          );

        const evidenceRows = await tx
          .select({
            id: memoryEvidence.id,
            metadata: memoryEvidence.metadata,
          })
          .from(memoryEvidence)
          .where(
            and(
              eq(memoryEvidence.memoryId, params.memoryId),
              inArray(memoryEvidence.chunkId, chunkIds),
            ),
          );

        for (const evidence of evidenceRows) {
          await tx
            .update(memoryEvidence)
            .set({
              metadata: mergeChunkMetadata(evidence.metadata, {
                correction: correctionMetadata,
              }),
            })
            .where(eq(memoryEvidence.id, evidence.id));
        }
      }

      updatedChunkCount = chunkIds.length;
    }

    return { updatedMemory, updatedChunkCount };
  });

  if (!result.updatedMemory) {
    throw new Error("Memory not found");
  }

  return {
    success: true,
    memory: result.updatedMemory,
    updatedChunkCount: result.updatedChunkCount,
  };
}

interface ListMemoryEvidenceParams {
  userId: string;
  workspaceId: string;
  memoryId: string;
}

/**
 * Lists the source chunks a workspace memory was extracted from, via the
 * `memory_evidence` linkage. Authorized to workspace members; the memory must
 * belong to this workspace's vault.
 */
export async function listCompanyBrainMemoryEvidence(
  params: ListMemoryEvidenceParams,
) {
  await requireWorkspaceMember(params.userId, params.workspaceId);

  const [memory] = await db
    .select({ id: memories.id })
    .from(memories)
    .where(
      and(
        eq(memories.id, params.memoryId),
        eq(memories.workspaceId, params.workspaceId),
        inArray(memories.memoryType, ["document", "company"]),
        isNull(memories.deletedAt),
      ),
    )
    .limit(1);

  if (!memory) {
    throw new Error("Memory not found");
  }

  const rows = await db
    .select({
      chunkId: memorySourceChunks.id,
      sourceId: memorySourceChunks.sourceId,
      chunkIndex: memorySourceChunks.chunkIndex,
      sectionPath: memorySourceChunks.sectionPath,
      pageNumber: memorySourceChunks.pageNumber,
      content: memorySourceChunks.content,
      title: memorySources.title,
      quote: memoryEvidence.quote,
      confidence: memoryEvidence.confidence,
    })
    .from(memoryEvidence)
    .innerJoin(
      memorySourceChunks,
      eq(memoryEvidence.chunkId, memorySourceChunks.id),
    )
    .innerJoin(memorySources, eq(memoryEvidence.sourceId, memorySources.id))
    .where(
      and(
        eq(memoryEvidence.memoryId, params.memoryId),
        eq(memorySourceChunks.workspaceId, params.workspaceId),
        eq(memorySources.workspaceId, params.workspaceId),
        eq(memorySourceChunks.sourceId, memoryEvidence.sourceId),
      ),
    )
    .orderBy(asc(memorySourceChunks.chunkIndex), asc(memoryEvidence.createdAt));

  return { evidence: rows };
}

export async function getCompanyBrainHierarchy(
  userId: string,
  workspaceId: string,
) {
  await requireWorkspaceMember(userId, workspaceId);

  const rows = await db
    .select({
      scope: memories.scope,
      project: memories.project,
      count: sql<number>`count(*)::int`,
    })
    .from(memories)
    .where(
      and(
        eq(memories.workspaceId, workspaceId),
        inArray(memories.memoryType, ["document", "company"]),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
      ),
    )
    .groupBy(memories.scope, memories.project)
    .orderBy(asc(memories.scope), asc(memories.project));

  const global = {
    count: 0,
    projects: [] as Array<{ name: string; value: string; count: number }>,
  };
  const scopes = new Map<
    string,
    {
      name: string;
      count: number;
      projects: Array<{ name: string; value: string; count: number }>;
    }
  >();

  for (const row of rows) {
    const project = {
      name: row.project ?? "No project",
      value: row.project ?? NO_PROJECT_FILTER_VALUE,
      count: row.count,
    };

    if (row.scope === null) {
      global.count += row.count;
      global.projects.push(project);
      continue;
    }

    const scope = scopes.get(row.scope) ?? {
      name: row.scope,
      count: 0,
      projects: [],
    };
    scope.count += row.count;
    scope.projects.push(project);
    scopes.set(row.scope, scope);
  }

  return {
    global,
    scopes: Array.from(scopes.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  };
}

export async function searchCompanyBrain(params: SearchCompanyBrainParams) {
  await requireWorkspaceMember(params.userId, params.workspaceId);

  const scope = normalizeScope(params.scope);
  const scopes = params.scopes
    ?.map((value) => normalizeScope(value))
    .filter((value): value is string => !!value);
  const chunks =
    params.mode === "memories"
      ? []
      : await searchCompanyBrainChunks({
          workspaceId: params.workspaceId,
          query: params.query,
          scope,
          scopes,
          project: params.project,
          limit: params.limit,
        });

  const memoryRows =
    params.mode === "documents"
      ? []
      : (
          await searchMemories({
            userId: params.userId,
            workspaceId: params.workspaceId,
            query: params.query,
            limit: params.limit,
            scope,
            scopes,
            project: params.project,
            memoryTypes: ["document", "company"],
          })
        ).memories;
  const memoryEvidenceRows =
    memoryRows.length === 0
      ? []
      : await db
          .select({
            memoryId: memoryEvidence.memoryId,
            sourceId: memoryEvidence.sourceId,
            chunkId: memoryEvidence.chunkId,
            quote: memoryEvidence.quote,
            confidence: memoryEvidence.confidence,
            title: memorySources.title,
            sectionPath: memorySourceChunks.sectionPath,
            chunkIndex: memorySourceChunks.chunkIndex,
          })
          .from(memoryEvidence)
          .innerJoin(
            memorySources,
            eq(memoryEvidence.sourceId, memorySources.id),
          )
          .innerJoin(
            memorySourceChunks,
            eq(memoryEvidence.chunkId, memorySourceChunks.id),
          )
          .where(
            and(
              eq(memoryEvidence.workspaceId, params.workspaceId),
              eq(memorySources.status, "completed"),
              inArray(
                memoryEvidence.memoryId,
                memoryRows.map((memory) => memory.id),
              ),
            ),
          );
  const evidenceByMemoryId = new Map<string, typeof memoryEvidenceRows>();
  for (const evidence of memoryEvidenceRows) {
    evidenceByMemoryId.set(evidence.memoryId, [
      ...(evidenceByMemoryId.get(evidence.memoryId) ?? []),
      evidence,
    ]);
  }
  const citedMemoryRows = memoryRows.filter((memory) =>
    evidenceByMemoryId.has(memory.id),
  );

  return {
    mode: params.mode,
    found: chunks.length + citedMemoryRows.length,
    chunks,
    memories: citedMemoryRows.map((memory) => ({
      ...memory,
      evidence: evidenceByMemoryId.get(memory.id) ?? [],
    })),
  };
}

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function getSearchTerms(query: string) {
  const stopWords = new Set([
    "about",
    "after",
    "does",
    "from",
    "have",
    "into",
    "says",
    "that",
    "the",
    "this",
    "what",
    "when",
    "where",
    "which",
    "with",
  ]);

  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 2 && !stopWords.has(term)),
    ),
  );
}

function getRequestedSectionNumbers(query: string) {
  const matches = query
    .toLowerCase()
    .matchAll(/\b(?:section|clause|article)\s+(\d+(?:\.\d+)*)\b/g);
  return Array.from(matches, (match) => match[1]);
}

function getDocumentChunkBoost(
  query: string,
  row: Pick<ChunkSearchRow, "content" | "sectionPath" | "title">,
) {
  const content = normalizeSearchText(row.content);
  const sectionPath = normalizeSearchText(row.sectionPath);
  const title = normalizeSearchText(row.title);
  const terms = getSearchTerms(query);
  const sectionNumbers = getRequestedSectionNumbers(query);
  let boost = 0;

  for (const sectionNumber of sectionNumbers) {
    const escapedSection = sectionNumber.replace(/\./g, "\\.");
    const sectionPattern = new RegExp(`(^|[^0-9])${escapedSection}(\\.|\\b)`);
    if (sectionPattern.test(sectionPath)) boost += 0.02;
    if (sectionPattern.test(content)) boost += 0.01;
  }

  if (terms.length > 0) {
    const sectionMatches = terms.filter((term) =>
      sectionPath.includes(term),
    ).length;
    const contentMatches = terms.filter((term) =>
      content.includes(term),
    ).length;
    const titleMatches = terms.filter((term) => title.includes(term)).length;

    boost += Math.min(0.025, sectionMatches * 0.008);
    boost += Math.min(0.01, titleMatches * 0.004);
    boost += Math.min(0.02, (contentMatches / terms.length) * 0.02);
  }

  const meaningfulQuery = terms.join(" ");
  if (meaningfulQuery.length > 8 && content.includes(meaningfulQuery)) {
    boost += 0.015;
  }

  return Math.min(boost, 0.06);
}

function getDocumentChunkQueryCoverage(
  query: string,
  chunk: Pick<CompanyBrainChunkResult, "content" | "sectionPath" | "title">,
) {
  const terms = getSearchTerms(query);
  if (terms.length === 0) return 0;

  const searchableText = [chunk.title, chunk.sectionPath, chunk.content]
    .map((value) => normalizeSearchText(value))
    .join(" ");
  const searchableTerms = new Set(searchableText.split(" ").filter(Boolean));
  const matchedTerms = terms.filter((term) => searchableTerms.has(term));

  return matchedTerms.length / terms.length;
}

function shouldRerankCompanyBrainChunks(
  query: string,
  candidates: CompanyBrainChunkResult[],
  limit: number,
) {
  if (candidates.length <= 1) return false;
  const minimumRerankCandidates = Math.min(
    Math.max(10, limit * 2),
    Math.max(limit, COMPANY_BRAIN_RERANK_CANDIDATES),
  );
  if (candidates.length < minimumRerankCandidates) return false;

  const topCandidate = candidates[0];
  if (!topCandidate) return false;

  return getDocumentChunkQueryCoverage(query, topCandidate) < 0.55;
}

function shouldExpandCompanyBrainQuery(
  candidates: CompanyBrainChunkResult[],
  limit: number,
) {
  return candidates.length < Math.min(limit, 3);
}

async function searchCompanyBrainChunks(params: {
  workspaceId: string;
  query: string;
  scope?: string;
  scopes?: string[];
  project?: string;
  limit: number;
}) {
  const noProject = params.project === NO_PROJECT_FILTER_VALUE;
  const project = noProject ? undefined : normalizeProjectName(params.project);
  const queryEmbedding = await generateEmbedding(params.query);
  const distance = cosineDistance(memorySourceChunks.embedding, queryEmbedding);
  const baseChunkConditions = [
    eq(memorySourceChunks.workspaceId, params.workspaceId),
    params.scopes && params.scopes.length > 0
      ? inArray(memorySourceChunks.scope, params.scopes)
      : params.scope
        ? eq(memorySourceChunks.scope, params.scope)
        : isNull(memorySourceChunks.scope),
  ];
  if (noProject) {
    baseChunkConditions.push(isNull(memorySourceChunks.project));
  } else if (project) {
    baseChunkConditions.push(eq(memorySourceChunks.project, project));
  }

  const vectorRows = await db
    .select({
      id: memorySourceChunks.id,
      sourceId: memorySourceChunks.sourceId,
      content: memorySourceChunks.content,
      contextualContent: memorySourceChunks.contextualContent,
      sectionPath: memorySourceChunks.sectionPath,
      scope: memorySourceChunks.scope,
      project: memorySourceChunks.project,
      chunkIndex: memorySourceChunks.chunkIndex,
      createdAt: memorySourceChunks.createdAt,
      title: memorySources.title,
      sourceType: memorySources.sourceType,
      distance,
    })
    .from(memorySourceChunks)
    .innerJoin(memorySources, eq(memorySourceChunks.sourceId, memorySources.id))
    .where(
      and(
        ...baseChunkConditions,
        eq(memorySources.status, "completed"),
        lt(distance, DOCUMENT_SEARCH_THRESHOLD),
      ),
    )
    .orderBy(asc(distance))
    .limit(Math.max(params.limit * 8, 40));

  const runFtsSearch = (queryText: string) => {
    const rank = sql<number>`ts_rank_cd(memory_source_chunks_content_tsv, websearch_to_tsquery('english', ${queryText}))`;
    return db
      .select({
        id: memorySourceChunks.id,
        sourceId: memorySourceChunks.sourceId,
        content: memorySourceChunks.content,
        contextualContent: memorySourceChunks.contextualContent,
        sectionPath: memorySourceChunks.sectionPath,
        scope: memorySourceChunks.scope,
        project: memorySourceChunks.project,
        chunkIndex: memorySourceChunks.chunkIndex,
        createdAt: memorySourceChunks.createdAt,
        title: memorySources.title,
        sourceType: memorySources.sourceType,
        rank,
      })
      .from(memorySourceChunks)
      .innerJoin(
        memorySources,
        eq(memorySourceChunks.sourceId, memorySources.id),
      )
      .where(
        and(
          ...baseChunkConditions,
          eq(memorySources.status, "completed"),
          sql`memory_source_chunks_content_tsv @@ websearch_to_tsquery('english', ${queryText})`,
        ),
      )
      .orderBy(desc(rank))
      .limit(Math.max(params.limit * 8, 40));
  };

  const buildCandidates = (ftsResultSets: ChunkSearchRow[][]) => {
    const fusedChunks = new Map<
      string,
      { score: number; row: ChunkSearchRow }
    >();
    const rrfK = 60;
    for (const resultSet of [vectorRows, ...ftsResultSets]) {
      resultSet.forEach((row, index) => {
        const existing = fusedChunks.get(row.id);
        fusedChunks.set(row.id, {
          score: (existing?.score ?? 0) + 1 / (rrfK + index + 1),
          row: existing?.row ?? row,
        });
      });
    }

    return Array.from(fusedChunks.values())
      .map((candidate) => ({
        ...candidate,
        score:
          candidate.score + getDocumentChunkBoost(params.query, candidate.row),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(params.limit, COMPANY_BRAIN_RERANK_CANDIDATES))
      .map(({ row, score }) => ({
        id: row.id,
        sourceId: row.sourceId,
        title: row.title,
        sourceType: row.sourceType,
        sectionPath: row.sectionPath,
        scope: row.scope,
        project: row.project,
        chunkIndex: row.chunkIndex,
        content: row.content,
        contextualContent: row.contextualContent,
        relevance: Math.round(score * 1000) / 1000,
        createdAt: row.createdAt,
      }));
  };

  const originalFtsResults = await runFtsSearch(params.query);
  let ftsResultSets = [originalFtsResults];
  let candidates = buildCandidates(ftsResultSets);

  if (shouldExpandCompanyBrainQuery(candidates, params.limit)) {
    const originalTopCoverage = candidates[0]
      ? getDocumentChunkQueryCoverage(params.query, candidates[0])
      : 0;
    const queryVariants = await generateQueryVariants(params.query);
    const validVariants = queryVariants.filter(
      (variant) => variant && variant.trim().length > 0,
    );
    const variantFtsResults = await Promise.all(
      validVariants.map((variant) => runFtsSearch(variant)),
    );
    ftsResultSets = [originalFtsResults, ...variantFtsResults];
    const expandedCandidates = buildCandidates(ftsResultSets);
    const expandedTopCoverage = expandedCandidates[0]
      ? getDocumentChunkQueryCoverage(params.query, expandedCandidates[0])
      : 0;

    if (expandedTopCoverage >= originalTopCoverage) {
      candidates = expandedCandidates;
    }
  }

  return rerankCompanyBrainChunks(params.query, candidates, params.limit);
}

async function rerankCompanyBrainChunks(
  query: string,
  candidates: CompanyBrainChunkResult[],
  limit: number,
) {
  if (!shouldRerankCompanyBrainChunks(query, candidates, limit)) {
    return candidates.slice(0, limit);
  }

  try {
    const reranked = await rerankDocuments({
      query,
      topN: limit,
      documents: candidates.map((candidate) =>
        [
          candidate.title ? `Document: ${candidate.title}` : undefined,
          candidate.sectionPath
            ? `Section: ${candidate.sectionPath}`
            : undefined,
          candidate.content,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    });

    if (reranked.length === 0) return candidates.slice(0, limit);

    const ordered = reranked
      .map((result) => {
        const candidate = candidates[result.index];
        if (!candidate) return null;
        return {
          ...candidate,
          relevance: Math.round(result.relevanceScore * 1000) / 1000,
        };
      })
      .filter((candidate): candidate is CompanyBrainChunkResult => !!candidate);

    return ordered.slice(0, limit);
  } catch (error) {
    logger.warn(
      {
        errorMessage: error instanceof Error ? error.message : String(error),
        candidateCount: candidates.length,
      },
      "context vault rerank failed; falling back to RRF order",
    );
    return candidates.slice(0, limit);
  }
}
