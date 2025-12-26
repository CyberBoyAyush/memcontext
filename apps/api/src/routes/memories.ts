import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { authMiddleware, type AuthContext } from "../middleware/auth.js";
import {
  rateLimitSaveMemory,
  rateLimitSearchMemory,
} from "../middleware/rate-limit.js";
import { saveMemory, searchMemories } from "../services/memory.js";
import { checkMemoryLimit } from "../services/subscription.js";
import type { MemoryCategory, MemorySource } from "@memcontext/types";

const app = new Hono<{
  Variables: {
    auth: AuthContext;
  };
}>();

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

app.post(
  "/",
  rateLimitSaveMemory,
  authMiddleware,
  zValidator("json", saveMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");

    // Always check fresh limit from DB, not cached value
    const limitCheck = await checkMemoryLimit(auth.userId);
    if (!limitCheck.allowed) {
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
    });

    return c.json(result, 201);
  },
);

app.get(
  "/search",
  rateLimitSearchMemory,
  authMiddleware,
  zValidator("query", searchMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const query = c.req.valid("query");

    const result = await searchMemories({
      userId: auth.userId,
      query: query.query,
      limit: query.limit,
      category: query.category as MemoryCategory | undefined,
      project: query.project,
    });

    return c.json(result);
  },
);

export default app;
