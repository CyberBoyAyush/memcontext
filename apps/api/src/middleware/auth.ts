import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db, apiKeys } from "../db/index.js";
import { getCachedApiKey, cacheApiKey } from "../services/cache.js";
import { hashApiKey } from "../utils/index.js";
import { eq, sql } from "drizzle-orm";
import type { CachedApiKeyData } from "@memcontext/types";

export interface AuthContext {
  userId: string;
  keyId: string;
}

export const authMiddleware = createMiddleware<{
  Variables: {
    auth: AuthContext;
  };
}>(async (c, next) => {
  const apiKeyHeader = c.req.header("X-API-Key");

  if (apiKeyHeader) {
    const auth = await validateApiKey(apiKeyHeader);
    if (auth) {
      c.set("auth", auth);
      return next();
    }
  }

  throw new HTTPException(401, {
    message: "Unauthorized: Valid API key required",
  });
});

async function validateApiKey(key: string): Promise<AuthContext | null> {
  const keyHash = hashApiKey(key);

  const cached = await getCachedApiKey(keyHash);
  if (cached) {
    updateLastUsed(cached.keyId).catch(console.error);
    return cached;
  }

  const [keyRecord] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!keyRecord) {
    return null;
  }

  const authContext: CachedApiKeyData = {
    userId: keyRecord.userId,
    keyId: keyRecord.id,
  };

  await cacheApiKey(keyHash, authContext);

  updateLastUsed(keyRecord.id).catch(console.error);

  return authContext;
}

async function updateLastUsed(keyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: sql`NOW()` })
    .where(eq(apiKeys.id, keyId));
}
