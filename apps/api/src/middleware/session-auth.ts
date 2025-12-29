import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

export interface SessionContext {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

export const sessionAuthMiddleware = createMiddleware<{
  Variables: {
    session: SessionContext;
    requestId?: string;
  };
}>(async (c, next) => {
  const requestId = c.get("requestId") || "unknown";
  const start = performance.now();

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const duration = Math.round(performance.now() - start);

  if (!session) {
    logger.warn(
      { requestId, duration, path: c.req.path },
      "session auth failed - no valid session",
    );
    throw new HTTPException(401, { message: "Unauthorized: Session required" });
  }

  logger.debug(
    { requestId, userId: session.user.id, duration },
    "session auth success",
  );

  c.set("session", {
    userId: session.user.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    },
  });

  return next();
});
