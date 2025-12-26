import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db, apiKeys } from "../db/index.js";
import {
  getCachedApiKey,
  cacheApiKey,
  type CachedApiKeyData,
} from "../services/cache.js";
import { getSubscriptionData } from "../services/subscription.js";
import { hashApiKey } from "../utils/index.js";
import { eq, sql } from "drizzle-orm";

export interface AuthContext {
  userId: string;
  keyId: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
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
    return {
      userId: cached.userId,
      keyId: cached.keyId,
      plan: cached.plan,
      memoryCount: cached.memoryCount,
      memoryLimit: cached.memoryLimit,
    };
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

  const subData = await getSubscriptionData(keyRecord.userId);

  const authContext: CachedApiKeyData = {
    userId: keyRecord.userId,
    keyId: keyRecord.id,
    plan: subData.plan,
    memoryCount: subData.memoryCount,
    memoryLimit: subData.memoryLimit,
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
