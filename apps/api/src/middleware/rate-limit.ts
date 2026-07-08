import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import type { PlanType } from "../db/schema.js";
import type { EitherAuthContext } from "./either-auth.js";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

const RATE_LIMIT_CONFIGS = {
  saveMemory: { windowMs: 60_000, max: 30, keyPrefix: "rl:save:" },
  searchMemory: { windowMs: 60_000, max: 60, keyPrefix: "rl:search:" },
  feedback: { windowMs: 60_000, max: 30, keyPrefix: "rl:feedback:" },
  health: { windowMs: 60_000, max: 60, keyPrefix: "rl:health:" },
  global: { windowMs: 60_000, max: 3_000, keyPrefix: "rl:global:" },
  waitlist: { windowMs: 3_600_000, max: 5, keyPrefix: "rl:waitlist:" },
} as const;

const PLAN_RATE_LIMITS: Record<
  PlanType,
  { saveMemory: number; searchMemory: number; feedback: number }
> = {
  free: { saveMemory: 30, searchMemory: 60, feedback: 30 },
  hobby: { saveMemory: 100, searchMemory: 200, feedback: 60 },
  pro: { saveMemory: 300, searchMemory: 600, feedback: 120 },
  ultimate: { saveMemory: 1_000, searchMemory: 2_000, feedback: 300 },
};

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
    const requestId = c.get("requestId") || "unknown";

    const start = performance.now();
    const result = await checkRateLimit(identifier, config);
    const duration = Math.round(performance.now() - start);

    c.header("X-RateLimit-Limit", config.max.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", result.resetAt.toString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

      logger.warn(
        {
          requestId,
          rateLimitType: configKey,
          rateLimitKey: identifier.substring(0, 20),
          limit: config.max,
          remaining: 0,
          resetAt: result.resetAt,
          retryAfter,
          duration,
        },
        "rate limit exceeded",
      );

      throw new HTTPException(429, {
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
    }

    logger.debug(
      {
        requestId,
        rateLimitType: configKey,
        remaining: result.remaining,
        duration,
      },
      "rate limit check passed",
    );

    await next();
  });
}

function getPlanAwareConfig(
  configKey: "saveMemory" | "searchMemory" | "feedback",
  plan: string | undefined,
): RateLimitConfig {
  const planLimits =
    PLAN_RATE_LIMITS[(plan as PlanType) || "free"] ?? PLAN_RATE_LIMITS.free;
  return {
    ...RATE_LIMIT_CONFIGS[configKey],
    max: planLimits[configKey],
  };
}

export function createPlanAwareRateLimiter(
  configKey: "saveMemory" | "searchMemory" | "feedback",
) {
  return createMiddleware(async (c, next) => {
    const auth = c.get("auth") as EitherAuthContext | undefined;
    const config = getPlanAwareConfig(configKey, auth?.plan);
    const identifier = auth?.userId
      ? `user:${auth.userId}:workspace:${auth.workspaceId ?? "default"}`
      : getClientIdentifier(c);
    const requestId = c.get("requestId") || "unknown";

    const start = performance.now();
    const result = await checkRateLimit(identifier, config);
    const duration = Math.round(performance.now() - start);

    c.header("X-RateLimit-Limit", config.max.toString());
    c.header("X-RateLimit-Remaining", result.remaining.toString());
    c.header("X-RateLimit-Reset", result.resetAt.toString());

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

      logger.warn(
        {
          requestId,
          rateLimitType: configKey,
          rateLimitKey: identifier.substring(0, 20),
          plan: auth?.plan ?? "free",
          limit: config.max,
          remaining: 0,
          resetAt: result.resetAt,
          retryAfter,
          duration,
        },
        "rate limit exceeded",
      );

      throw new HTTPException(429, {
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      });
    }

    logger.debug(
      {
        requestId,
        rateLimitType: configKey,
        plan: auth?.plan ?? "free",
        remaining: result.remaining,
        duration,
      },
      "rate limit check passed",
    );

    await next();
  });
}

export const rateLimitSaveMemory = createPlanAwareRateLimiter("saveMemory");
export const rateLimitSearchMemory = createPlanAwareRateLimiter("searchMemory");
export const rateLimitFeedback = createPlanAwareRateLimiter("feedback");
export const rateLimitHealth = createRateLimiter("health");
export const rateLimitGlobal = createRateLimiter("global");
export const rateLimitWaitlist = createRateLimiter("waitlist");
