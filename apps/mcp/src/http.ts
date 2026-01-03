#!/usr/bin/env node
import "./env.js";

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createApiClient } from "./lib/api-client.js";
import { registerTools } from "./tools.js";

const app = express();
const port = parseInt(process.env.MCP_HTTP_PORT || "3001", 10);
const apiBase = process.env.MEMCONTEXT_API_URL || "http://localhost:3000";

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, X-API-Key, MEMCONTEXT-API-Key, Mcp-Session-Id",
  );
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

function extractApiKey(req: express.Request): string | null {
  const key = req.headers["memcontext-api-key"] || req.headers["x-api-key"];
  if (Array.isArray(key)) return key[0] || null;
  return key || null;
}

app.post("/mcp", async (req, res) => {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    const requestId = req.body?.id ?? null;
    res.status(401).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Missing API key. Provide MEMCONTEXT-API-Key or X-API-Key header.",
      },
      id: requestId,
    });
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const server = new McpServer({
    name: "memcontext",
    version: "1.0.0",
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  const apiClient = createApiClient({ apiBase, apiKey });
  registerTools(server, apiClient);

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message:
        "SSE streams not supported. This server operates in stateless mode.",
    },
    id: null,
  });
});

app.delete("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message:
        "Session termination not supported. This server operates in stateless mode.",
    },
    id: null,
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", mode: "stateless", version: "1.0.0" });
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
