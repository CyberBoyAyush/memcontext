import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

const API_KEY_CACHE_PREFIX = "api_key:";
const CACHE_TTL_SECONDS = 24 * 60 * 60;

export interface CachedApiKeyData {
  userId: string;
  keyId: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

function getCacheKey(keyHash: string): string {
  return `${API_KEY_CACHE_PREFIX}${keyHash}`;
}

export async function getCachedApiKey(
  keyHash: string,
): Promise<CachedApiKeyData | null> {
  const start = performance.now();
  const cacheKey = getCacheKey(keyHash);

  try {
    const data = await redis.getex<CachedApiKeyData>(cacheKey, {
      ex: CACHE_TTL_SECONDS,
    });

    const duration = Math.round(performance.now() - start);

    if (data) {
      logger.debug(
        {
          operation: "cache_hit",
          key: cacheKey.substring(0, 20) + "...",
          duration,
        },
        "api key cache hit",
      );
    } else {
      logger.debug(
        {
          operation: "cache_miss",
          key: cacheKey.substring(0, 20) + "...",
          duration,
        },
        "api key cache miss",
      );
    }

    return data;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        operation: "cache_get",
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "cache get failed",
    );
    return null;
  }
}

export async function cacheApiKey(
  keyHash: string,
  data: CachedApiKeyData,
): Promise<void> {
  const start = performance.now();
  const cacheKey = getCacheKey(keyHash);

  try {
    await redis.set(cacheKey, data, { ex: CACHE_TTL_SECONDS });

    const duration = Math.round(performance.now() - start);
    logger.debug(
      {
        operation: "cache_set",
        key: cacheKey.substring(0, 20) + "...",
        ttl: CACHE_TTL_SECONDS,
        duration,
      },
      "api key cached",
    );
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        operation: "cache_set",
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "cache set failed",
    );
  }
}

export async function invalidateApiKey(keyHash: string): Promise<void> {
  const start = performance.now();
  const cacheKey = getCacheKey(keyHash);

  try {
    await redis.del(cacheKey);

    const duration = Math.round(performance.now() - start);
    logger.debug(
      {
        operation: "cache_invalidate",
        key: cacheKey.substring(0, 20) + "...",
        duration,
      },
      "api key cache invalidated",
    );
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        operation: "cache_invalidate",
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "cache invalidate failed",
    );
  }
}

export async function updateCachedMemoryCount(
  keyHash: string,
  memoryCount: number,
): Promise<void> {
  const start = performance.now();
  const cacheKey = getCacheKey(keyHash);

  try {
    const data = await redis.get<CachedApiKeyData>(cacheKey);
    if (data) {
      data.memoryCount = memoryCount;
      await redis.set(cacheKey, data, { ex: CACHE_TTL_SECONDS });

      const duration = Math.round(performance.now() - start);
      logger.debug(
        {
          operation: "cache_update_memory_count",
          newCount: memoryCount,
          duration,
        },
        "memory count updated in cache",
      );
    }
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        operation: "cache_update_memory_count",
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "cache memory count update failed",
    );
  }
}
