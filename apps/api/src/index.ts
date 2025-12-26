import "./env.js";

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { checkDbConnection, closeDb } from "./db/index.js";
import memoriesRoutes from "./routes/memories.js";
import apiKeysRoutes from "./routes/api-keys.js";
import type { HealthResponse } from "@memcontext/types";

const app = new Hono();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  }),
);

app.get("/health", async (c) => {
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

  console.error("Unhandled error:", err);

  return c.json(
    {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
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
