import { createMiddleware } from "hono/factory";
import { logger } from "../lib/logger.js";
import {
  createTimingContext,
  getTotalDuration,
  getTimings,
  type TimingContext,
} from "../utils/timing.js";
import { nanoid } from "nanoid";
import type { AuthContext } from "./auth.js";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    timing: TimingContext;
    auth?: AuthContext;
  }
}

export const requestLogger = createMiddleware(async (c, next) => {
  const requestId = `req_${nanoid(12)}`;
  const timing = createTimingContext();

  c.set("requestId", requestId);
  c.set("timing", timing);

  const method = c.req.method;
  const path = c.req.path;
  const query = c.req.query();
  const userAgent = c.req.header("user-agent");
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0].trim() ||
    c.req.header("x-real-ip") ||
    "unknown";

  logger.debug(
    {
      requestId,
      method,
      path,
      query: Object.keys(query).length > 0 ? query : undefined,
      userAgent,
      ip,
    },
    "request started",
  );

  try {
    await next();
  } catch (error) {
    throw error;
  } finally {
    const duration = getTotalDuration(timing);
    const timings = getTimings(timing);
    const statusCode = c.res.status;
    const auth = c.get("auth");

    const logData = {
      requestId,
      method,
      path,
      statusCode,
      duration,
      timings: Object.keys(timings).length > 0 ? timings : undefined,
      userId: auth?.userId,
      ip,
      userAgent,
      contentLength: c.res.headers.get("content-length"),
    };

    c.header("X-Request-Id", requestId);
    c.header("X-Response-Time", `${duration}ms`);

    if (statusCode >= 500) {
      logger.error(logData, "request failed");
    } else if (statusCode >= 400) {
      logger.warn(logData, "request error");
    } else {
      logger.info(logData, "request completed");
    }
  }
});

export function getRequestId(c: { get: (key: "requestId") => string }): string {
  return c.get("requestId") || "unknown";
}

export function getTimingContext(c: {
  get: (key: "timing") => TimingContext;
}): TimingContext {
  return c.get("timing") || createTimingContext();
}
