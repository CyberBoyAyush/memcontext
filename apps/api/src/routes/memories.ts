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
  validUntil: z.string().datetime().optional(),
});

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
});

const listMemorySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  category: z.string().max(200).optional(),
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  project: z.string().max(500).optional(),
  search: z.string().max(200, "Search query too long").optional(),
});

const updateMemorySchema = z.object({
  content: z.string().trim().min(1).max(10000).optional(),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().max(100).optional(),
});

const scopedQuerySchema = z.object({
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
});

const profileQuerySchema = z.object({
  scope: z.string().trim().min(1).max(200, "Scope too long").optional(),
  project: z.string().max(100, "Project name too long").optional(),
});

const memoryIdParamSchema = z.object({
  id: z.string().uuid("Invalid memory ID format"),
});

const feedbackSchema = z.object({
  type: z.enum(["helpful", "not_helpful", "outdated", "wrong"]),
  context: z.string().max(1000, "Feedback context too long").optional(),
});

// === Shared Routes (API Key OR Session) ===

// POST / - Save memory (MCP + Dashboard)
app.post(
  "/",
  rateLimitSaveMemory,
  eitherAuthMiddleware,
  zValidator("json", saveMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");
    const timing = getTimingContext(c);

    // Early limit check - saves LLM/embedding costs when user is already at limit
    const limitCheck = await checkMemoryLimit(auth.userId);
    if (!limitCheck.allowed) {
      throw new HTTPException(403, {
        message: `Memory limit exceeded. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}. Upgrade your plan at https://app.memcontext.in/settings`,
      });
    }

    const result = await saveMemory({
      userId: auth.userId,
      content: body.content,
      category: body.category as MemoryCategory | undefined,
      scope: body.scope,
      project: body.project,
      source: body.source as MemorySource,
      timing,
      validUntil: body.validUntil,
    });

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
        const sub = await getSubscriptionData(auth.userId);
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
        result.id,
        body.scope,
      );
      await invalidateCachedProfile(
        auth.userId,
        persistedMemory?.scope ?? body.scope,
        persistedMemory?.project ?? body.project,
      ).catch(() => {});
      await invalidateCachedProfile(auth.userId, body.scope).catch(() => {});
    }

    return c.json(result, 201);
  },
);

// GET /search - Search memories (MCP + Dashboard)
app.get(
  "/search",
  rateLimitSearchMemory,
  eitherAuthMiddleware,
  zValidator("query", searchMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");
    const timing = getTimingContext(c);

    const result = await searchMemories({
      userId: auth.userId,
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

// GET /profile - Pre-aggregated user context
app.get(
  "/profile",
  eitherAuthMiddleware,
  zValidator("query", profileQuerySchema),
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");

    const cached = await getCachedProfile(
      auth.userId,
      query.scope,
      query.project,
    );
    if (cached) {
      return c.json(cached);
    }

    const profile = await getMemoryProfile(
      auth.userId,
      query.project,
      query.scope,
    );
    await cacheProfile(auth.userId, query.scope, query.project, profile);
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
    const graph = await getMemoryGraph(auth.userId, query.scope);
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
      limit: query.limit,
      offset: query.offset,
      categories: categories?.length ? categories : undefined,
      scope: query.scope,
      projects: projects?.length ? projects : undefined,
      search: query.search,
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

    const result = await getMemoryHistory(auth.userId, memoryId, query.scope);
    if (!result) {
      throw new HTTPException(404, { message: "Memory not found" });
    }

    return c.json(result);
  },
);

// POST /:id/feedback - Submit feedback for a memory
app.post(
  "/:id/feedback",
  rateLimitFeedback,
  eitherAuthMiddleware,
  zValidator("param", memoryIdParamSchema),
  zValidator("query", scopedQuerySchema),
  zValidator("json", feedbackSchema),
  async (c) => {
    const auth = c.get("auth");
    const { id: memoryId } = c.req.valid("param");
    const query = c.req.valid("query");
    const body = c.req.valid("json");

    try {
      const result = await submitFeedback(
        auth.userId,
        memoryId,
        body.type as FeedbackType,
        body.context,
        query.scope,
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
    const existing = await getMemory(auth.userId, memoryId, query.scope);

    const deleted = await deleteMemory(auth.userId, memoryId, query.scope);

    if (!deleted) {
      throw new HTTPException(404, { message: "Memory not found" });
    }

    await Promise.all([
      invalidateCachedProfile(auth.userId, existing?.scope),
      invalidateCachedProfile(auth.userId, existing?.scope, existing?.project),
    ]).catch(() => {});

    if (auth.authType === "api_key" && auth.keyHash) {
      try {
        const sub = await getSubscriptionData(auth.userId);
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

    const memory = await getMemory(auth.userId, memoryId, query.scope);
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
    const existing = await getMemory(auth.userId, memoryId, query.scope);

    const result = await updateMemory({
      userId: auth.userId,
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
      invalidateCachedProfile(auth.userId, existing?.scope),
      invalidateCachedProfile(auth.userId, existing?.scope, existing?.project),
      invalidateCachedProfile(auth.userId, existing?.scope, body.project),
    ]).catch(() => {});

    return c.json(result);
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
    const existing = await getMemory(auth.userId, memoryId, query.scope);

    const deleted = await deleteMemory(auth.userId, memoryId, query.scope);

    if (!deleted) {
      throw new HTTPException(404, { message: "Memory not found" });
    }

    await Promise.all([
      invalidateCachedProfile(auth.userId, existing?.scope),
      invalidateCachedProfile(auth.userId, existing?.scope, existing?.project),
    ]).catch(() => {});

    if (auth.authType === "api_key" && auth.keyHash) {
      try {
        const sub = await getSubscriptionData(auth.userId);
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
