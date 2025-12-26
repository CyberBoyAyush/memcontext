import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

function getRedisConfig(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required",
    );
  }

  return { url, token };
}

export function getRedis(): Redis {
  if (!redisInstance) {
    const config = getRedisConfig();
    redisInstance = new Redis(config);
  }
  return redisInstance;
}

export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    return Reflect.get(getRedis(), prop);
  },
});
