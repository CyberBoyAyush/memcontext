import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import {
  eitherAuthMiddleware,
  type EitherAuthContext,
} from "../middleware/either-auth.js";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import {
  rateLimitSaveMemory,
  rateLimitSearchMemory,
} from "../middleware/rate-limit.js";
import {
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
import { updateCachedMemoryCount } from "../services/cache.js";
import { getTimingContext } from "../middleware/request-logger.js";
import { logger } from "../lib/logger.js";
import type { MemoryCategory, MemorySource } from "@memcontext/types";
import type { TimingContext } from "../utils/timing.js";

const app = new Hono<{
  Variables: {
    auth: EitherAuthContext;
    session: SessionContext;
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
  project: z.string().max(100, "Project name too long").optional(),
  source: z.enum(["mcp", "web", "api"]).optional().default("api"),
});

const searchMemorySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Query is required")
    .max(1000, "Query too long (max 1000 chars)"),
  limit: z.coerce.number().min(1).max(10).optional().default(5),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().max(100, "Project name too long").optional(),
});

const listMemorySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().max(100, "Project name too long").optional(),
  search: z.string().max(200, "Search query too long").optional(),
});

const updateMemorySchema = z.object({
  content: z.string().trim().min(1).max(10000).optional(),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().max(100).optional(),
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

    const limitCheck = await checkMemoryLimit(auth.userId);
    if (!limitCheck.allowed) {
      logger.warn(
        {
          userId: auth.userId,
          currentCount: limitCheck.current,
          limit: limitCheck.limit,
          plan: auth.plan,
        },
        "memory limit exceeded",
      );

      throw new HTTPException(403, {
        message: `Memory limit exceeded. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}. Upgrade your plan for more storage.`,
      });
    }

    const result = await saveMemory({
      userId: auth.userId,
      content: body.content,
      category: body.category as MemoryCategory | undefined,
      project: body.project,
      source: body.source as MemorySource,
      timing,
    });

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
      project: query.project,
      timing,
    });

    return c.json(result);
  },
);

// === Dashboard-only Routes (Session Auth) ===

// GET / - List memories (Dashboard only)
app.get(
  "/",
  sessionAuthMiddleware,
  zValidator("query", listMemorySchema),
  async (c) => {
    const { userId } = c.get("session");
    const query = c.req.valid("query");

    const result = await listMemories({
      userId,
      limit: query.limit,
      offset: query.offset,
      category: query.category as MemoryCategory | undefined,
      project: query.project,
      search: query.search,
    });

    return c.json(result);
  },
);

// PATCH /:id - Update memory (Dashboard only)
app.patch(
  "/:id",
  sessionAuthMiddleware,
  zValidator("json", updateMemorySchema),
  async (c) => {
    const { userId } = c.get("session");
    const memoryId = c.req.param("id");
    const body = c.req.valid("json");
    const timing = getTimingContext(c);

    const result = await updateMemory({
      userId,
      memoryId,
      content: body.content,
      category: body.category as MemoryCategory | undefined,
      project: body.project,
      timing,
    });

    if (!result.success) {
      throw new HTTPException(result.error === "Memory not found" ? 404 : 400, {
        message: result.error ?? "Failed to update memory",
      });
    }

    return c.json(result);
  },
);

// DELETE /:id - Delete memory (Dashboard only)
app.delete("/:id", sessionAuthMiddleware, async (c) => {
  const { userId } = c.get("session");
  const memoryId = c.req.param("id");

  const deleted = await deleteMemory(userId, memoryId);

  if (!deleted) {
    throw new HTTPException(404, { message: "Memory not found" });
  }

  return c.json({ success: true });
});

export default app;
