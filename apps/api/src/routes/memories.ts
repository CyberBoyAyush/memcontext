import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware, type AuthContext } from "../middleware/auth.js";
import { saveMemory, searchMemories } from "../services/memory.js";
import type { MemoryCategory, MemorySource } from "@memcontext/types";

const app = new Hono<{
  Variables: {
    auth: AuthContext;
  };
}>();

const saveMemorySchema = z.object({
  content: z.string().min(1, "Content is required"),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().optional(),
  source: z.enum(["mcp", "web", "api"]).optional().default("api"),
});

const searchMemorySchema = z.object({
  query: z.string().min(1, "Query is required"),
  limit: z.coerce.number().min(1).max(10).optional().default(5),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().optional(),
});

app.post(
  "/",
  authMiddleware,
  zValidator("json", saveMemorySchema),
  async (c) => {
    const auth = c.get("auth");
    const body = c.req.valid("json");

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
