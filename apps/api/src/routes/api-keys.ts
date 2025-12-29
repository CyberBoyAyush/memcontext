import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { db, apiKeys } from "../db/index.js";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import {
  generateApiKey,
  extractKeyPrefix,
  hashApiKey,
} from "../utils/index.js";
import { invalidateApiKey } from "../services/cache.js";
import { eq, and } from "drizzle-orm";
import type { CreateApiKeyResponse, ApiKey } from "@memcontext/types";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

// All routes require session authentication
app.use("*", sessionAuthMiddleware);

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

// POST / - Create API key
app.post("/", zValidator("json", createApiKeySchema), async (c) => {
  const { userId } = c.get("session");
  const body = c.req.valid("json");

  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = extractKeyPrefix(key);

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      userId,
      name: body.name,
      keyHash,
      keyPrefix,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
    });

  const response: CreateApiKeyResponse = {
    id: newKey.id,
    name: newKey.name,
    keyPrefix: newKey.keyPrefix,
    key,
    createdAt: newKey.createdAt,
  };

  return c.json(response, 201);
});

// GET / - List API keys
app.get("/", async (c) => {
  const { userId } = c.get("session");

  const keys = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      keyPrefix: apiKeys.keyPrefix,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  const formattedKeys: ApiKey[] = keys.map((k) => ({
    id: k.id,
    userId: k.userId,
    keyPrefix: k.keyPrefix,
    name: k.name,
    lastUsedAt: k.lastUsedAt ?? undefined,
    createdAt: k.createdAt,
  }));

  return c.json({ keys: formattedKeys });
});

// DELETE /:id - Delete API key
app.delete("/:id", async (c) => {
  const { userId } = c.get("session");
  const keyId = c.req.param("id");

  const [deletedKey] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ keyHash: apiKeys.keyHash });

  if (!deletedKey) {
    throw new HTTPException(404, { message: "API key not found" });
  }

  await invalidateApiKey(deletedKey.keyHash);

  return c.json({ success: true });
});

export default app;
