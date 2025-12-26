import { redis } from "../lib/redis.js";

const API_KEY_CACHE_PREFIX = "api_key:";
const CACHE_TTL_SECONDS = 24 * 60 * 60; // 1 day instead of 7 days

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

export async function updateCachedMemoryCount(
  keyHash: string,
  memoryCount: number,
): Promise<void> {
  const cacheKey = getCacheKey(keyHash);
  const data = await redis.get<CachedApiKeyData>(cacheKey);
  if (data) {
    data.memoryCount = memoryCount;
    await redis.set(cacheKey, data, { ex: CACHE_TTL_SECONDS });
  }
}
