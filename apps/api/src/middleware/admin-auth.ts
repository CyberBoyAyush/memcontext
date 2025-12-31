import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { db } from "../db/index.js";
import { user } from "../db/auth-schema.js";
import { eq } from "drizzle-orm";

export interface AdminContext {
  userId: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: string;
  };
}

export const adminAuthMiddleware = createMiddleware<{
  Variables: {
    admin: AdminContext;
    requestId?: string;
  };
}>(async (c, next) => {
  const requestId = c.get("requestId") || "unknown";
  const start = performance.now();

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const sessionDuration = Math.round(performance.now() - start);

  if (!session) {
    logger.warn(
      { requestId, sessionDuration, path: c.req.path },
      "admin auth failed - no valid session",
    );
    throw new HTTPException(401, { message: "Unauthorized: Session required" });
  }

  const dbStart = performance.now();
  const [dbUser] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  const dbDuration = Math.round(performance.now() - dbStart);

  if (!dbUser || dbUser.role !== "admin") {
    logger.warn(
      {
        requestId,
        userId: session.user.id,
        role: dbUser?.role || "unknown",
        sessionDuration,
        dbDuration,
        path: c.req.path,
      },
      "admin auth failed - not an admin",
    );
    throw new HTTPException(403, {
      message: "Forbidden: Admin access required",
    });
  }

  const totalDuration = Math.round(performance.now() - start);
  logger.info(
    {
      requestId,
      userId: session.user.id,
      email: session.user.email,
      sessionDuration,
      dbDuration,
      totalDuration,
      path: c.req.path,
      method: c.req.method,
    },
    "admin auth success - action logged",
  );

  c.set("admin", {
    userId: session.user.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: dbUser.role,
    },
  });

  return next();
});
