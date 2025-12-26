import { redis } from "../lib/redis.js";
import type { CachedApiKeyData } from "@memcontext/types";

const API_KEY_CACHE_PREFIX = "api_key:";
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

function getCacheKey(keyHash: string): string {
  return `${API_KEY_CACHE_PREFIX}${keyHash}`;
}

export async function getCachedApiKey(
  keyHash: string,
): Promise<CachedApiKeyData | null> {
  const cacheKey = getCacheKey(keyHash);

  const data = await redis.getex<CachedApiKeyData>(cacheKey, {
    ex: CACHE_TTL_SECONDS,
  });

  return data;
}

export async function cacheApiKey(
  keyHash: string,
  data: CachedApiKeyData,
): Promise<void> {
  const cacheKey = getCacheKey(keyHash);
  await redis.set(cacheKey, data, { ex: CACHE_TTL_SECONDS });
}

export async function invalidateApiKey(keyHash: string): Promise<void> {
  const cacheKey = getCacheKey(keyHash);
  await redis.del(cacheKey);
}
