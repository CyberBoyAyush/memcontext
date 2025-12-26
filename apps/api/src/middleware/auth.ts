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
import { logger } from "../lib/logger.js";
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
  const requestId = c.get("requestId") || "unknown";
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    c.req.header("x-real-ip") ||
    "unknown";

  if (!apiKeyHeader) {
    logger.warn(
      {
        requestId,
        ip,
        path: c.req.path,
        reason: "missing_api_key",
      },
      "auth failed - missing api key",
    );

    throw new HTTPException(401, {
      message: "Unauthorized: Valid API key required",
    });
  }

  const auth = await validateApiKey(apiKeyHeader, requestId, ip);

  if (!auth) {
    logger.warn(
      {
        requestId,
        ip,
        keyPrefix: apiKeyHeader.substring(0, 8) + "...",
        reason: "invalid_api_key",
      },
      "auth failed - invalid api key",
    );

    throw new HTTPException(401, {
      message: "Unauthorized: Valid API key required",
    });
  }

  logger.debug(
    {
      requestId,
      userId: auth.userId,
      plan: auth.plan,
      memoryCount: auth.memoryCount,
      memoryLimit: auth.memoryLimit,
    },
    "auth success",
  );

  c.set("auth", auth);
  return next();
});

async function validateApiKey(
  key: string,
  requestId: string,
  ip: string,
): Promise<AuthContext | null> {
  const keyHash = hashApiKey(key);

  const cached = await getCachedApiKey(keyHash);
  if (cached) {
    updateLastUsed(cached.keyId).catch((err) => {
      logger.error(
        {
          keyId: cached.keyId,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
        "failed to update last used",
      );
    });

    return {
      userId: cached.userId,
      keyId: cached.keyId,
      plan: cached.plan,
      memoryCount: cached.memoryCount,
      memoryLimit: cached.memoryLimit,
    };
  }

  const start = performance.now();
  const [keyRecord] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  const duration = Math.round(performance.now() - start);

  if (!keyRecord) {
    logger.debug(
      {
        requestId,
        ip,
        duration,
      },
      "api key not found in database",
    );
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

  updateLastUsed(keyRecord.id).catch((err) => {
    logger.error(
      {
        keyId: keyRecord.id,
        errorMessage: err instanceof Error ? err.message : String(err),
      },
      "failed to update last used",
    );
  });

  logger.debug(
    {
      requestId,
      userId: keyRecord.userId,
      duration,
    },
    "api key validated from database",
  );

  return authContext;
}

async function updateLastUsed(keyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: sql`NOW()` })
    .where(eq(apiKeys.id, keyId));
}
