import "./env.js";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { checkDbConnection, closeDb } from "./db/index.js";
import { rateLimitHealth, rateLimitGlobal } from "./middleware/rate-limit.js";
import { generateErrorId, logError } from "./utils/error.js";
import memoriesRoutes from "./routes/memories.js";
import apiKeysRoutes from "./routes/api-keys.js";
import type { HealthResponse } from "@memcontext/types";

const app = new Hono();

app.use("*", logger());

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow memcontext.in and all subdomains (e.g., api.memcontext.in, app.memcontext.in)
  if (/^https?:\/\/([a-z0-9-]+\.)?memcontext\.in$/.test(origin)) return true;
  return false;
}

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*"; // Allow non-browser requests (MCP, curl, etc.)
      if (isAllowedOrigin(origin)) return origin;
      return null; // Reject unknown origins
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  }),
);

app.use("*", bodyLimit({ maxSize: 50 * 1024 })); // 50KB limit

app.use("/api/*", rateLimitGlobal);

app.get("/health", rateLimitHealth, async (c) => {
  const dbHealthy = await checkDbConnection();

  const response: HealthResponse = {
    status: dbHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    database: dbHealthy,
  };

  return c.json(response, dbHealthy ? 200 : 503);
});

app.route("/api/memories", memoriesRoutes);
app.route("/api/api-keys", apiKeysRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        code: `HTTP_${err.status}`,
      },
      err.status,
    );
  }

  const errorId = generateErrorId();
  logError("unhandled_request_error", errorId, err);

  return c.json(
    {
      error: "An unexpected error occurred. Please try again.",
      code: "INTERNAL_ERROR",
      errorId,
    },
    500,
  );
});

app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      code: "NOT_FOUND",
    },
    404,
  );
});

const port = parseInt(process.env.PORT || "3000", 10);

console.log(`Starting MemContext API server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

const shutdown = async () => {
  console.log("\nShutting down...");
  await closeDb();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`MemContext API server running at http://localhost:${port}`);

export default app;
