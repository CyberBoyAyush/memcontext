import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { db, apiKeys } from "../db/index.js";
import {
  getCachedApiKey,
  cacheApiKey,
  invalidateApiKey,
  type CachedApiKeyData,
} from "../services/cache.js";
import { getSubscriptionData } from "../services/subscription.js";
import { getWorkspaceMembership } from "../services/workspace.js";
import { hashApiKey } from "../utils/index.js";
import { logger } from "../lib/logger.js";
import { eq, sql } from "drizzle-orm";

export interface AuthContext {
  userId: string;
  workspaceId: string;
  keyId: string;
  keyHash: string;
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

export async function validateApiKey(
  key: string,
  requestId: string,
  ip: string,
): Promise<AuthContext | null> {
  const keyHash = hashApiKey(key);

  const cached = await getCachedApiKey(keyHash);
  if (cached) {
    const [keyRecord] = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        workspaceId: apiKeys.workspaceId,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (
      !keyRecord ||
      keyRecord.id !== cached.keyId ||
      keyRecord.userId !== cached.userId ||
      keyRecord.workspaceId !== cached.workspaceId
    ) {
      await invalidateApiKey(keyHash);
      logger.warn(
        { keyId: cached.keyId, userId: cached.userId },
        "api key denied - cached binding is stale",
      );
      return null;
    }

    const membership = await getWorkspaceMembership(
      cached.userId,
      cached.workspaceId,
    );
    if (!membership) {
      await invalidateApiKey(keyHash);
      logger.warn(
        { userId: cached.userId, workspaceId: cached.workspaceId, keyId: cached.keyId },
        "api key denied - cached user is not a workspace member",
      );
      return null;
    }

    const subData = await getSubscriptionData(cached.userId, cached.workspaceId);
    await cacheApiKey(keyHash, {
      ...cached,
      plan: subData.plan,
      memoryCount: subData.memoryCount,
      memoryLimit: subData.memoryLimit,
    });

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
      workspaceId: cached.workspaceId,
      keyId: cached.keyId,
      keyHash,
      plan: subData.plan,
      memoryCount: subData.memoryCount,
      memoryLimit: subData.memoryLimit,
    };
  }

  const start = performance.now();
  const [keyRecord] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      workspaceId: apiKeys.workspaceId,
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

  if (!keyRecord.workspaceId) {
    logger.warn(
      { userId: keyRecord.userId, keyId: keyRecord.id },
      "api key denied - missing workspace binding",
    );
    return null;
  }

  const workspaceId = keyRecord.workspaceId;

  const membership = await getWorkspaceMembership(keyRecord.userId, workspaceId);
  if (!membership) {
    logger.warn(
      { userId: keyRecord.userId, workspaceId, keyId: keyRecord.id },
      "api key denied - user is not a workspace member",
    );
    return null;
  }

  const subData = await getSubscriptionData(keyRecord.userId, workspaceId);

  const authContext: CachedApiKeyData = {
    userId: keyRecord.userId,
    workspaceId,
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

  return {
    ...authContext,
    keyHash,
  };
}

async function updateLastUsed(keyId: string): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: sql`NOW()` })
    .where(eq(apiKeys.id, keyId));
}
