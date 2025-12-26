import { Redis } from "@upstash/redis";
import { logger } from "./logger.js";

let redisInstance: Redis | null = null;
let connectionLogged = false;

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

    if (!connectionLogged) {
      connectionLogged = true;
      const host = config.url.replace(/^https?:\/\//, "").split("/")[0];
      logger.info({ host }, "redis connected");
    }
  }
  return redisInstance;
}

export const redis = new Proxy({} as Redis, {
  get(_, prop) {
    return Reflect.get(getRedis(), prop);
  },
});

export async function checkRedisConnection(): Promise<boolean> {
  const start = performance.now();
  try {
    await getRedis().ping();
    const duration = Math.round(performance.now() - start);
    logger.debug({ duration }, "redis health check passed");
    return true;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "redis health check failed",
    );
    return false;
  }
}
