#!/usr/bin/env node
import "./env.js";

import express from "express";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createApiClient } from "./lib/api-client.js";
import { registerTools } from "./tools.js";

const app = express();
const port = parseInt(process.env.MCP_HTTP_PORT || "3001", 10);
const apiBase = process.env.MEMCONTEXT_API_URL || "http://localhost:3000";

const MAX_SESSIONS = 1000;
const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, X-API-Key, MEMCONTEXT-API-Key, Mcp-Session-Id",
  );
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

interface SessionData {
  transport: StreamableHTTPServerTransport;
  apiKey: string;
  lastActivityAt: number;
}

const sessions: Map<string, SessionData> = new Map();

function cleanupStaleSessions(): void {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivityAt > SESSION_IDLE_TIMEOUT_MS) {
      console.log(`Cleaning up stale session: ${sessionId}`);
      sessions.delete(sessionId);
    }
  }
}

setInterval(cleanupStaleSessions, 5 * 60 * 1000); // Run cleanup every 5 minutes

function extractApiKey(req: express.Request): string | null {
  const key = req.headers["memcontext-api-key"] || req.headers["x-api-key"];
  if (Array.isArray(key)) return key[0] || null;
  return key || null;
}

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.lastActivityAt = Date.now();
    await session.transport.handleRequest(req, res, req.body);
    return;
  }

  // Allow re-initialization if session expired or doesn't exist
  if (isInitializeRequest(req.body)) {
    if (sessions.size >= MAX_SESSIONS) {
      res.status(503).json({
        error: "Server at capacity. Please try again later.",
      });
      return;
    }

    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({
        error:
          "Missing API key. Provide MEMCONTEXT-API-Key or X-API-Key header.",
      });
      return;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        sessions.set(sid, { transport, apiKey, lastActivityAt: Date.now() });
        console.log(`Session initialized: ${sid}`);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`Session closed: ${transport.sessionId}`);
        sessions.delete(transport.sessionId);
      }
    };

    const server = new McpServer({
      name: "memcontext",
      version: "1.0.0",
    });

    const apiClient = createApiClient({ apiBase, apiKey });
    registerTools(server, apiClient);

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // Session expired or doesn't exist - client should re-initialize
  res.status(410).json({
    error: "Session expired or not found. Please re-initialize the connection.",
    code: "SESSION_EXPIRED",
  });
});

const handleSessionRequest = async (
  req: express.Request,
  res: express.Response,
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const session = sessions.get(sessionId)!;
  session.lastActivityAt = Date.now();
  await session.transport.handleRequest(req, res);
};

app.get("/mcp", handleSessionRequest);
app.delete("/mcp", handleSessionRequest);

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", sessions: sessions.size });
});

app.listen(port, () => {
  console.log(`MemContext MCP HTTP server running at http://localhost:${port}`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down HTTP MCP server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down HTTP MCP server...");
  process.exit(0);
});
