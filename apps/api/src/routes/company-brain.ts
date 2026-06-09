import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import {
  eitherAuthMiddleware,
  type EitherAuthContext,
} from "../middleware/either-auth.js";
import {
  cancelCompanyBrainDocument,
  correctCompanyBrainMemory,
  deleteCompanyBrainDocument,
  deleteCompanyBrainMemory,
  getCompanyBrainHierarchy,
  ingestCompanyBrainDocument,
  listCompanyBrainDocumentMemories,
  listCompanyBrainDocuments,
  listCompanyBrainMemories,
  listCompanyBrainMemoryEvidence,
  saveCompanyBrainMemory,
  searchCompanyBrain,
  submitCompanyBrainMemoryFeedback,
} from "../services/company-brain.js";
import {
  deleteDocumentObject,
  uploadDocumentObject,
} from "../services/document-storage.js";
import { requireWorkspaceMember } from "../services/workspace.js";
import { rateLimitFeedback } from "../middleware/rate-limit.js";
import { logger } from "../lib/logger.js";

const app = new Hono<{
  Variables: {
    auth: EitherAuthContext;
  };
}>();

app.use("*", eitherAuthMiddleware);
app.use("/documents", bodyLimit({ maxSize: 512 * 1024 }));
app.use("/documents/upload", bodyLimit({ maxSize: 25 * 1024 * 1024 }));

const sourceTypeSchema = z.enum([
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
]);

const ingestDocumentSchema = z
  .object({
    workspaceId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(250_000).optional(),
    sourceType: sourceTypeSchema.optional(),
    scope: z.string().trim().min(1).max(200).optional(),
    project: z.string().max(100).optional(),
    mimeType: z.string().max(200).optional(),
    originalFilename: z.string().max(300).optional(),
    uri: z.string().url().max(1000).optional(),
    crawlSubpages: z.boolean().optional(),
    priorityPageLimit: z.coerce.number().int().min(1).max(25).optional(),
    subpageTarget: z.array(z.string().trim().min(1).max(100)).max(8).optional(),
    category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  })
  .refine((data) => data.content || data.uri, {
    message: "Either content or uri is required",
    path: ["content"],
  });

const documentsQuerySchema = z.object({
  workspaceId: z.string().uuid(),
});

const hierarchyQuerySchema = z.object({
  workspaceId: z.string().uuid(),
});

const memoriesQuerySchema = z.object({
  workspaceId: z.string().uuid(),
  scope: z.string().trim().min(1).max(200).optional(),
  project: z.string().max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

function parseProjectsParam(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function parseScopesParam(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

const memoryFeedbackSchema = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(["helpful", "not_helpful", "outdated", "wrong"]),
  context: z.string().max(1000).optional(),
});

const createCompanyMemorySchema = z.object({
  workspaceId: z.string().uuid(),
  content: z.string().trim().min(1).max(800),
  category: z
    .enum(["preference", "fact", "decision", "context"])
    .default("fact"),
  scope: z.string().trim().min(1).max(200).optional(),
  project: z.string().trim().min(1).max(100).optional(),
});

const memoryCorrectionSchema = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(["wrong", "outdated", "incomplete"]).default("wrong"),
  correctedContent: z.string().trim().min(1).max(10_000),
  reason: z.string().trim().max(1000).optional(),
  correctedChunkContent: z.string().trim().min(1).max(20_000).optional(),
  evidenceChunkId: z.string().uuid().optional(),
});

const searchSchema = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().trim().min(1).max(1000),
  mode: z.enum(["memories", "documents", "hybrid"]).default("hybrid"),
  scope: z.string().trim().min(1).max(200).optional(),
  scopes: z.string().trim().min(1).max(1000).optional(),
  project: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(20).default(8),
});

const documentIdParamSchema = z.object({
  documentId: z.string().uuid(),
});

const uploadFieldsSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  scope: z.string().trim().min(1).max(200).optional(),
  project: z.string().max(100).optional(),
  content: z.string().trim().min(1).max(250_000).optional(),
  sourceType: sourceTypeSchema.optional(),
});

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const TEXT_EXTRACTABLE_SOURCE_TYPES = new Set([
  "markdown",
  "text",
  "html",
  "url",
  "csv",
]);

const SOURCE_TYPE_MIME_TYPES: Record<string, string> = {
  markdown: "text/markdown",
  text: "text/plain",
  html: "text/html",
  csv: "text/csv",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  tiff: "image/tiff",
};
const REMOTE_FILE_SOURCE_TYPES = new Set([
  "pdf",
  "markdown",
  "text",
  "docx",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "tiff",
]);
const BINARY_REMOTE_FILE_SOURCE_TYPES = new Set([
  "pdf",
  "docx",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "tiff",
]);

function normalizeDocumentUrl(rawUrl?: string) {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function inferSourceType(filenameOrUrl: string, contentType?: string) {
  const lower = filenameOrUrl.toLowerCase();
  if (contentType?.includes("markdown") || lower.endsWith(".md")) {
    return "markdown";
  }
  if (contentType?.startsWith("text/plain") || lower.endsWith(".txt")) {
    return "text";
  }
  if (
    contentType?.includes("html") ||
    lower.endsWith(".html") ||
    lower.endsWith(".htm")
  ) {
    return "html";
  }
  if (contentType?.includes("csv") || lower.endsWith(".csv")) return "csv";
  if (contentType?.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (contentType?.includes("wordprocessingml") || lower.endsWith(".docx")) {
    return "docx";
  }
  if (contentType?.includes("png") || lower.endsWith(".png")) return "png";
  if (
    contentType?.includes("jpeg") ||
    contentType?.includes("jpg") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg")
  ) {
    return lower.endsWith(".jpg") ? "jpg" : "jpeg";
  }
  if (contentType?.includes("webp") || lower.endsWith(".webp")) return "webp";
  if (
    contentType?.includes("tiff") ||
    lower.endsWith(".tif") ||
    lower.endsWith(".tiff")
  ) {
    return "tiff";
  }
  return "text";
}

function hasRemoteFileSignal(uri: string, mimeType?: string) {
  const pathname = new URL(uri).pathname.toLowerCase();
  return (
    !!mimeType ||
    /\.(pdf|md|markdown|txt|docx|csv|png|jpe?g|webp|tiff?|html?)$/i.test(
      pathname,
    )
  );
}

function getMimeTypeForExtraction(sourceType: string, mimeType?: string) {
  const normalizedMimeType = mimeType?.split(";")[0]?.trim();
  if (
    normalizedMimeType &&
    normalizedMimeType !== "application/octet-stream" &&
    normalizedMimeType !== "binary/octet-stream"
  ) {
    return normalizedMimeType;
  }
  return SOURCE_TYPE_MIME_TYPES[sourceType] ?? "application/octet-stream";
}

async function extractTextFromBytes(bytes: Uint8Array, sourceType: string) {
  if (TEXT_EXTRACTABLE_SOURCE_TYPES.has(sourceType)) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  return undefined;
}

async function fetchRemoteDocumentBytes(uri: string) {
  const response = await fetch(uri, {
    redirect: "follow",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Could not fetch remote document (${response.status})`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    throw new Error("Remote document is too large");
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Remote document is too large");
  }

  return {
    bytes,
    contentType: response.headers.get("content-type") ?? undefined,
  };
}

async function requireWorkspaceWriter(userId: string, workspaceId: string) {
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (membership.role === "viewer") {
    throw new Error("Viewers cannot ingest workspace documents");
  }
}

app.get("/documents", zValidator("query", documentsQuerySchema), async (c) => {
  const { userId } = c.get("auth");
  const query = c.req.valid("query");

  try {
    return c.json(await listCompanyBrainDocuments(userId, query.workspaceId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list documents";
    if (message === "Workspace not found") {
      throw new HTTPException(404, { message });
    }
    logger.error({ userId, error: message }, "list vault documents failed");
    throw new HTTPException(500, { message: "Failed to list documents" });
  }
});

app.get("/hierarchy", zValidator("query", hierarchyQuerySchema), async (c) => {
  const { userId } = c.get("auth");
  const query = c.req.valid("query");

  try {
    return c.json(await getCompanyBrainHierarchy(userId, query.workspaceId));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load hierarchy";
    if (message === "Workspace not found") {
      throw new HTTPException(404, { message });
    }
    logger.error({ userId, error: message }, "load vault hierarchy failed");
    throw new HTTPException(500, { message: "Failed to load hierarchy" });
  }
});

app.get("/memories", zValidator("query", memoriesQuerySchema), async (c) => {
  const { userId } = c.get("auth");
  const query = c.req.valid("query");
  const projects = parseProjectsParam(c.req.query("projects"));

  try {
    return c.json(
      await listCompanyBrainMemories({ userId, ...query, projects }),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list memories";
    // Only authorization/not-found maps to 404; everything else is a 500.
    if (message === "Workspace not found") {
      throw new HTTPException(404, { message });
    }
    logger.error({ userId, error: message }, "list vault memories failed");
    throw new HTTPException(500, { message: "Failed to list memories" });
  }
});

app.post(
  "/memories",
  zValidator("json", createCompanyMemorySchema),
  async (c) => {
    const { userId } = c.get("auth");
    const body = c.req.valid("json");

    try {
      return c.json(
        await saveCompanyBrainMemory({
          userId,
          workspaceId: body.workspaceId,
          content: body.content,
          category: body.category,
          scope: body.scope,
          project: body.project,
        }),
        201,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add company fact";
      if (message === "Workspace not found") {
        throw new HTTPException(404, { message });
      }
      if (message === "Viewers cannot add company facts") {
        throw new HTTPException(403, { message });
      }
      logger.error({ userId, error: message }, "create vault memory failed");
      throw new HTTPException(500, { message: "Failed to add company fact" });
    }
  },
);

app.post(
  "/memories/:memoryId/feedback",
  rateLimitFeedback,
  zValidator("param", z.object({ memoryId: z.string().uuid() })),
  zValidator("json", memoryFeedbackSchema),
  async (c) => {
    const { userId } = c.get("auth");
    const { memoryId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      return c.json(
        await submitCompanyBrainMemoryFeedback({
          userId,
          workspaceId: body.workspaceId,
          memoryId,
          type: body.type,
          context: body.context,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit feedback";
      if (message === "Workspace not found" || message === "Memory not found") {
        throw new HTTPException(404, { message });
      }
      logger.error(
        { userId, memoryId, error: message },
        "vault feedback failed",
      );
      throw new HTTPException(500, { message: "Failed to submit feedback" });
    }
  },
);

app.post(
  "/memories/:memoryId/correction",
  rateLimitFeedback,
  zValidator("param", z.object({ memoryId: z.string().uuid() })),
  zValidator("json", memoryCorrectionSchema),
  async (c) => {
    const { userId } = c.get("auth");
    const { memoryId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      return c.json(
        await correctCompanyBrainMemory({
          userId,
          workspaceId: body.workspaceId,
          memoryId,
          type: body.type,
          correctedContent: body.correctedContent,
          reason: body.reason,
          correctedChunkContent: body.correctedChunkContent,
          evidenceChunkId: body.evidenceChunkId,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to correct memory";
      if (message === "Workspace not found" || message === "Memory not found") {
        throw new HTTPException(404, { message });
      }
      if (message === "Viewers cannot correct workspace memories") {
        throw new HTTPException(403, { message });
      }
      if (message === "Corrected content is required") {
        throw new HTTPException(400, { message });
      }
      logger.error(
        { userId, memoryId, error: message },
        "vault correction failed",
      );
      throw new HTTPException(500, { message: "Failed to correct memory" });
    }
  },
);

app.delete(
  "/memories/:memoryId",
  zValidator("param", z.object({ memoryId: z.string().uuid() })),
  zValidator("query", hierarchyQuerySchema),
  async (c) => {
    const { userId } = c.get("auth");
    const { memoryId } = c.req.valid("param");
    const { workspaceId } = c.req.valid("query");

    try {
      return c.json(
        await deleteCompanyBrainMemory({ userId, workspaceId, memoryId }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete memory";
      if (message === "Workspace not found" || message === "Memory not found") {
        throw new HTTPException(404, { message });
      }
      if (message === "Viewers cannot delete company facts") {
        throw new HTTPException(403, { message });
      }
      logger.error(
        { userId, memoryId, error: message },
        "vault memory delete failed",
      );
      throw new HTTPException(500, { message: "Failed to delete memory" });
    }
  },
);

app.get(
  "/memories/:memoryId/evidence",
  zValidator("param", z.object({ memoryId: z.string().uuid() })),
  zValidator("query", hierarchyQuerySchema),
  async (c) => {
    const { userId } = c.get("auth");
    const { memoryId } = c.req.valid("param");
    const { workspaceId } = c.req.valid("query");

    try {
      return c.json(
        await listCompanyBrainMemoryEvidence({ userId, workspaceId, memoryId }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load evidence";
      if (message === "Workspace not found" || message === "Memory not found") {
        throw new HTTPException(404, { message });
      }
      logger.error(
        { userId, memoryId, error: message },
        "vault evidence failed",
      );
      throw new HTTPException(500, { message: "Failed to load evidence" });
    }
  },
);

app.post("/documents", zValidator("json", ingestDocumentSchema), async (c) => {
  const { userId } = c.get("auth");
  const body = c.req.valid("json");
  let uploadedStorageKey: string | undefined;

  try {
    await requireWorkspaceWriter(userId, body.workspaceId);
    const normalizedUri = normalizeDocumentUrl(body.uri);
    const explicitSourceType = body.sourceType;
    const inferredUriSourceType = normalizedUri
      ? inferSourceType(normalizedUri, body.mimeType)
      : undefined;
    const sourceType =
      explicitSourceType ??
      (normalizedUri ? inferredUriSourceType : "text") ??
      "text";
    const explicitRemoteFile =
      !!explicitSourceType &&
      REMOTE_FILE_SOURCE_TYPES.has(explicitSourceType) &&
      (BINARY_REMOTE_FILE_SOURCE_TYPES.has(explicitSourceType) ||
        (!!normalizedUri && hasRemoteFileSignal(normalizedUri, body.mimeType)));
    const shouldFetchRemoteFile =
      !!normalizedUri &&
      !body.content &&
      (explicitSourceType
        ? explicitRemoteFile
        : hasRemoteFileSignal(normalizedUri, body.mimeType)) &&
      REMOTE_FILE_SOURCE_TYPES.has(sourceType);

    if (shouldFetchRemoteFile) {
      const remoteDocument = await fetchRemoteDocumentBytes(normalizedUri);
      const finalSourceType =
        explicitSourceType ??
        inferSourceType(normalizedUri, remoteDocument.contentType);
      const filename =
        body.originalFilename ??
        decodeURIComponent(
          new URL(normalizedUri).pathname.split("/").filter(Boolean).pop() ??
            "remote-document",
        );
      const storage = await uploadDocumentObject({
        workspaceId: body.workspaceId,
        userId,
        filename,
        contentType: getMimeTypeForExtraction(
          finalSourceType,
          remoteDocument.contentType,
        ),
        body: remoteDocument.bytes,
      });
      uploadedStorageKey = storage.storageKey;
      const content = await extractTextFromBytes(
        remoteDocument.bytes,
        finalSourceType,
      );
      const result = await ingestCompanyBrainDocument({
        userId,
        ...body,
        content,
        sourceType: finalSourceType,
        uri: normalizedUri,
        publicUrl: storage.publicUrl,
        storageKey: storage.storageKey,
        mimeType: getMimeTypeForExtraction(
          finalSourceType,
          remoteDocument.contentType,
        ),
        originalFilename: filename,
        crawlSubpages: false,
        metadata: { originalUrl: normalizedUri },
      });
      return c.json(result, 202);
    }

    const isUrlOnlyIngestion = !!normalizedUri && !body.content;
    const result = await ingestCompanyBrainDocument({
      userId,
      ...body,
      content: body.content,
      sourceType: isUrlOnlyIngestion
        ? "url"
        : (sourceType ?? (normalizedUri ? "url" : "text")),
      uri: normalizedUri,
      publicUrl: normalizedUri,
      mimeType: isUrlOnlyIngestion ? "text/markdown" : body.mimeType,
      crawlSubpages: body.crawlSubpages,
      priorityPageLimit: body.priorityPageLimit,
      subpageTarget: body.subpageTarget,
      metadata: normalizedUri ? { originalUrl: normalizedUri } : undefined,
    });
    return c.json(result, 202);
  } catch (error) {
    if (uploadedStorageKey) {
      deleteDocumentObject(uploadedStorageKey).catch(() => {});
    }
    const message =
      error instanceof Error ? error.message : "Failed to ingest document";
    throw new HTTPException(message === "Workspace not found" ? 404 : 400, {
      message,
    });
  }
});

app.post("/documents/upload", async (c) => {
  const { userId } = c.get("auth");
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: "File is required" });
  }

  const parsedFields = uploadFieldsSchema.safeParse({
    workspaceId: String(body.workspaceId ?? ""),
    title: String(body.title || file.name || "Uploaded document"),
    scope: body.scope ? String(body.scope) : undefined,
    project: body.project ? String(body.project) : undefined,
    content: typeof body.content === "string" ? body.content : undefined,
    sourceType: body.sourceType
      ? String(body.sourceType)
      : inferSourceType(file.name, file.type),
  });
  if (!parsedFields.success) {
    throw new HTTPException(400, { message: "Invalid upload fields" });
  }
  const { workspaceId, title, scope, project } = parsedFields.data;
  const sourceType =
    parsedFields.data.sourceType ?? inferSourceType(file.name, file.type);
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new HTTPException(413, { message: "File too large" });
  }

  let uploadedStorageKey: string | undefined;

  try {
    await requireWorkspaceWriter(userId, workspaceId);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const storage = await uploadDocumentObject({
      workspaceId,
      userId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      body: bytes,
    });
    uploadedStorageKey = storage.storageKey;
    const fallbackContent = parsedFields.data.content;
    const content =
      fallbackContent ?? (await extractTextFromBytes(bytes, sourceType));
    const result = await ingestCompanyBrainDocument({
      userId,
      workspaceId,
      title,
      content,
      sourceType,
      scope,
      project,
      mimeType: getMimeTypeForExtraction(sourceType, file.type),
      originalFilename: file.name,
      storageKey: storage.storageKey,
      publicUrl: storage.publicUrl,
    });
    return c.json(result, 202);
  } catch (error) {
    if (uploadedStorageKey) {
      deleteDocumentObject(uploadedStorageKey).catch(() => {});
    }
    const message =
      error instanceof Error ? error.message : "Failed to upload document";
    throw new HTTPException(message === "Workspace not found" ? 404 : 400, {
      message,
    });
  }
});

app.get(
  "/documents/:documentId/memories",
  zValidator("param", documentIdParamSchema),
  zValidator("query", documentsQuerySchema),
  async (c) => {
    const { userId } = c.get("auth");
    const { documentId } = c.req.valid("param");
    const { workspaceId } = c.req.valid("query");

    try {
      return c.json(
        await listCompanyBrainDocumentMemories({
          userId,
          workspaceId,
          documentId,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to list memories";
      if (
        message === "Workspace not found" ||
        message === "Document not found"
      ) {
        throw new HTTPException(404, { message });
      }
      logger.error(
        { userId, documentId, error: message },
        "list document memories failed",
      );
      throw new HTTPException(500, { message: "Failed to list memories" });
    }
  },
);

app.post(
  "/documents/:documentId/cancel",
  zValidator("param", documentIdParamSchema),
  async (c) => {
    const { userId } = c.get("auth");
    const { documentId } = c.req.valid("param");

    try {
      return c.json(await cancelCompanyBrainDocument({ userId, documentId }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel document";
      throw new HTTPException(message === "Document not found" ? 404 : 400, {
        message,
      });
    }
  },
);

app.delete(
  "/documents/:documentId",
  zValidator("param", documentIdParamSchema),
  async (c) => {
    const { userId } = c.get("auth");
    const { documentId } = c.req.valid("param");

    try {
      return c.json(await deleteCompanyBrainDocument({ userId, documentId }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete document";
      throw new HTTPException(message === "Document not found" ? 404 : 400, {
        message,
      });
    }
  },
);

app.get("/search", zValidator("query", searchSchema), async (c) => {
  const { userId } = c.get("auth");
  const query = c.req.valid("query");
  const scopes = parseScopesParam(c.req.query("scopes"));

  try {
    return c.json(await searchCompanyBrain({ userId, ...query, scopes }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to search context vault";
    throw new HTTPException(message === "Workspace not found" ? 404 : 400, {
      message,
    });
  }
});

export default app;
