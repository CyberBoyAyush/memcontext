import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, apiKeys } from "../db/index.js";
import {
  generateApiKey,
  extractKeyPrefix,
  hashApiKey,
} from "../utils/index.js";
import { invalidateApiKey } from "../services/cache.js";
import { eq, and } from "drizzle-orm";
import type { CreateApiKeyResponse, ApiKey } from "@memcontext/types";

const app = new Hono();

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  userId: z.string().min(1, "User ID is required"),
});

app.post("/", zValidator("json", createApiKeySchema), async (c) => {
  const body = c.req.valid("json");

  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = extractKeyPrefix(key);

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      userId: body.userId,
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

app.get("/", async (c) => {
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "userId query parameter is required" }, 400);
  }

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

app.delete("/:id", async (c) => {
  const keyId = c.req.param("id");
  const userId = c.req.query("userId");

  if (!userId) {
    return c.json({ error: "userId query parameter is required" }, 400);
  }

  const [deletedKey] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ keyHash: apiKeys.keyHash });

  if (!deletedKey) {
    return c.json({ error: "API key not found" }, 404);
  }

  await invalidateApiKey(deletedKey.keyHash);

  return c.json({ success: true });
});

export default app;
