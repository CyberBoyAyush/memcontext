import "./env.js";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { checkDbConnection, closeDb } from "./db/index.js";
import { rateLimitHealth, rateLimitGlobal } from "./middleware/rate-limit.js";
import { requestLogger, getRequestId } from "./middleware/request-logger.js";
import { logger } from "./lib/logger.js";
import {
  AppError,
  generateErrorId,
  serializeError,
} from "./utils/app-error.js";
import { auth } from "./lib/auth.js";
import { normalizeMcpOAuthRequest } from "./lib/mcp-oauth.js";
import { env } from "./env.js";
import memoriesRoutes from "./routes/memories.js";
import apiKeysRoutes from "./routes/api-keys.js";
import userRoutes from "./routes/user.js";
import waitlistRoutes from "./routes/waitlist.js";
import adminRoutes from "./routes/admin.js";
import subscriptionRoutes from "./routes/subscription.js";
import workspacesRoutes from "./routes/workspaces.js";
import contextVaultRoutes from "./routes/context-vault.js";
import { startMemorySourceProcessor } from "./services/memory.js";
import { startContextVaultProcessor } from "./services/context-vault.js";
import type { HealthResponse } from "@memcontext/types";

const app = new Hono();
const defaultBodyLimit = bodyLimit({ maxSize: 50 * 1024 });

app.use("*", requestLogger);

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3010",
  "http://localhost:3020",
  "http://localhost:5173",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)?memcontext\.in$/.test(origin)) return true;
  if (/^https?:\/\/([a-z0-9-]+\.)?loclx\.io$/.test(origin)) return true;
  return false;
}

const appCors = cors({
  origin: (origin) => {
    if (!origin) return "*";
    if (isAllowedOrigin(origin)) return origin;
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "X-API-Key",
    "x-captcha-response",
  ],
  credentials: true,
});

// Credential-less OAuth endpoints that browser-based MCP clients call directly.
const publicOAuthCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "DPoP",
    "MCP-Protocol-Version",
  ],
});

const PUBLIC_OAUTH_PATHS = new Set([
  "/api/auth/jwks",
  "/api/auth/oauth2/token",
  "/api/auth/oauth2/register",
  "/api/auth/oauth2/revoke",
]);

app.use("*", (c, next) =>
  c.req.path.startsWith("/.well-known/") ||
  c.req.path.startsWith("/api/auth/.well-known/") ||
  PUBLIC_OAUTH_PATHS.has(c.req.path)
    ? publicOAuthCors(c, next)
    : appCors(c, next),
);

app.use("*", (c, next) => {
  if (
    c.req.path === "/api/context-vault/documents" ||
    c.req.path === "/api/context-vault/documents/upload"
  ) {
    return next();
  }
  return defaultBodyLimit(c, next);
});

app.use("/api/*", rateLimitGlobal);

// Fallback redirect for OAuth - when Better Auth redirects to API root after OAuth,
// redirect to dashboard. This is a known workaround for Better Auth issue #3407
app.get("/", (c) => {
  return c.redirect(env.DASHBOARD_URL);
});

app.get("/health", rateLimitHealth, async (c) => {
  const dbHealthy = await checkDbConnection();

  const response: HealthResponse = {
    status: dbHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    database: dbHealthy,
  };

  if (!dbHealthy) {
    logger.warn(
      { requestId: getRequestId(c) },
      "health check failed - database unhealthy",
    );
  }

  return c.json(response, dbHealthy ? 200 : 503);
});

// Mount Better Auth handler (BEFORE other /api routes)
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  return auth.handler(await normalizeMcpOAuthRequest(c.req.raw));
});

// RFC 8414 / RFC 9728 / OIDC discovery must live at the domain root, with the
// issuer path (/api/auth) inserted after the well-known segment.
app.get("/.well-known/*", (c) => auth.handler(c.req.raw));

app.route("/api/memories", memoriesRoutes);
app.route("/api/api-keys", apiKeysRoutes);
app.route("/api/user", userRoutes);
app.route("/api/waitlist", waitlistRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/subscription", subscriptionRoutes);
app.route("/api/workspaces", workspacesRoutes);
app.route("/api/context-vault", contextVaultRoutes);

app.onError((err, c) => {
  const requestId = getRequestId(c);

  if (err instanceof HTTPException) {
    logger.warn(
      {
        requestId,
        statusCode: err.status,
        errorMessage: err.message,
      },
      "http exception",
    );

    return c.json(
      {
        error: err.message,
        code: `HTTP_${err.status}`,
        requestId,
      },
      err.status,
    );
  }

  if (err instanceof AppError) {
    logger.error(
      {
        requestId,
        ...err.toLogObject(),
      },
      "application error",
    );

    return c.json(
      {
        error: err.message,
        code: err.code,
        errorId: err.id,
        requestId,
      },
      err.statusCode as 400 | 401 | 403 | 404 | 429 | 500 | 502 | 503,
    );
  }

  const errorId = generateErrorId();
  const serialized = serializeError(err);

  logger.error(
    {
      requestId,
      errorId,
      errorName: serialized.name,
      errorMessage: serialized.message,
      errorStack: serialized.stack,
      errorCode: serialized.code,
    },
    "unhandled error",
  );

  return c.json(
    {
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
      errorId,
      requestId,
    },
    500,
  );
});

app.notFound((c) => {
  const requestId = getRequestId(c);

  logger.debug(
    {
      requestId,
      path: c.req.path,
      method: c.req.method,
    },
    "route not found",
  );

  return c.json(
    {
      error: "Not found",
      code: "NOT_FOUND",
      requestId,
    },
    404,
  );
});

const port = parseInt(process.env.PORT || "3000", 10);
const startTime = Date.now();

logger.info(
  {
    port,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL || "info",
    nodeVersion: process.version,
  },
  "starting server",
);

startMemorySourceProcessor();
startContextVaultProcessor();

serve({
  fetch: app.fetch,
  port,
});

const shutdown = async (signal: string) => {
  const uptime = Math.round((Date.now() - startTime) / 1000);

  logger.info(
    {
      signal,
      uptime,
    },
    "shutting down server",
  );

  await closeDb();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

logger.info(
  {
    port,
    url: `http://localhost:${port}`,
  },
  "server started",
);

export default app;
