import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { redis } from "../lib/redis.js";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

const RATE_LIMIT_CONFIGS = {
  saveMemory: { windowMs: 60_000, max: 30, keyPrefix: "rl:save:" },
  searchMemory: { windowMs: 60_000, max: 60, keyPrefix: "rl:search:" },
  health: { windowMs: 60_000, max: 60, keyPrefix: "rl:health:" },
  global: { windowMs: 60_000, max: 100, keyPrefix: "rl:global:" },
} as const;

async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowKey = `${config.keyPrefix}${key}:${Math.floor(now / config.windowMs)}`;

  const count = await redis.incr(windowKey);

  if (count === 1) {
    await redis.expire(windowKey, Math.ceil(config.windowMs / 1000));
  }

  const resetAt = (Math.floor(now / config.windowMs) + 1) * config.windowMs;

  return {
    allowed: count <= config.max,
    remaining: Math.max(0, config.max - count),
    resetAt,
  };
}

function getClientIdentifier(
  c: Parameters<Parameters<typeof createMiddleware>[0]>[0],
): string {
  const apiKey = c.req.header("X-API-Key");
  if (apiKey) {
    return `key:${apiKey.slice(0, 16)}`;
  }

  const forwarded = c.req.header("X-Forwarded-For");
  if (forwarded) {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }

  return "ip:unknown";
}

export function createRateLimiter(configKey: keyof typeof RATE_LIMIT_CONFIGS) {
  const config = RATE_LIMIT_CONFIGS[configKey];

  return createMiddleware(async (c, next) => {
    const identifier = getClientIdentifier(c);
    const result = await checkRateLimit(identifier, config);

    c.header("X-RateLimit-Limit", config.max.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", result.resetAt.toString());

    if (!result.allowed) {
      throw new HTTPException(429, {
        message: `Rate limit exceeded. Try again in ${Math.ceil((result.resetAt - Date.now()) / 1000)} seconds.`,
      });
    }

    await next();
  });
}

export const rateLimitSaveMemory = createRateLimiter("saveMemory");
export const rateLimitSearchMemory = createRateLimiter("searchMemory");
export const rateLimitHealth = createRateLimiter("health");
export const rateLimitGlobal = createRateLimiter("global");
