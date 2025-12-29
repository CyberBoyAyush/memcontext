import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../lib/auth.js";
import { validateApiKey } from "./auth.js";
import { getSubscriptionData } from "../services/subscription.js";
import { logger } from "../lib/logger.js";

export interface EitherAuthContext {
  userId: string;
  authType: "api_key" | "session";
  // API key specific (present when authType is "api_key")
  keyId?: string;
  keyHash?: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

export const eitherAuthMiddleware = createMiddleware<{
  Variables: {
    auth: EitherAuthContext;
    requestId?: string;
  };
}>(async (c, next) => {
  const requestId = c.get("requestId") || "unknown";
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    c.req.header("x-real-ip") ||
    "unknown";
  const start = performance.now();

  // Try API Key first
  const apiKeyHeader = c.req.header("X-API-Key");
  if (apiKeyHeader) {
    const apiKeyAuth = await validateApiKey(apiKeyHeader, requestId, ip);
    if (apiKeyAuth) {
      const duration = Math.round(performance.now() - start);
      logger.debug(
        { requestId, userId: apiKeyAuth.userId, authType: "api_key", duration },
        "either auth success via api key",
      );
      c.set("auth", {
        userId: apiKeyAuth.userId,
        authType: "api_key",
        keyId: apiKeyAuth.keyId,
        keyHash: apiKeyAuth.keyHash,
        plan: apiKeyAuth.plan,
        memoryCount: apiKeyAuth.memoryCount,
        memoryLimit: apiKeyAuth.memoryLimit,
      });
      return next();
    }
  }

  // Fall back to session
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (session) {
    // Fetch subscription data for session user
    const subData = await getSubscriptionData(session.user.id);
    const duration = Math.round(performance.now() - start);

    logger.debug(
      { requestId, userId: session.user.id, authType: "session", duration },
      "either auth success via session",
    );

    c.set("auth", {
      userId: session.user.id,
      authType: "session",
      plan: subData.plan,
      memoryCount: subData.memoryCount,
      memoryLimit: subData.memoryLimit,
    });
    return next();
  }

  // Neither auth method succeeded
  const duration = Math.round(performance.now() - start);
  logger.warn(
    { requestId, ip, duration, path: c.req.path },
    "either auth failed - no valid api key or session",
  );
  throw new HTTPException(401, { message: "Unauthorized" });
});
