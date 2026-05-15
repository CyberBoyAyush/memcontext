#!/usr/bin/env node
import "./env.js";

import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createApiClient } from "./lib/api-client.js";
import { registerTools } from "./tools.js";

const app = express();
const port = parseInt(process.env.MCP_HTTP_PORT || "3001", 10);
const apiBase = process.env.MEMCONTEXT_API_URL || "https://api.memcontext.in";
const DEFAULT_SCOPES = "openid offline_access mcp:memories";

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, X-API-Key, MEMCONTEXT-API-Key, Mcp-Session-Id",
  );
  res.header("Access-Control-Expose-Headers", "Mcp-Session-Id, WWW-Authenticate");
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

function extractBearerToken(req: express.Request): string | null {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

function getRequestOrigin(req: express.Request): string {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function getProtectedResourceUrl(req: express.Request): string {
  return `${getRequestOrigin(req)}/.well-known/oauth-protected-resource/mcp`;
}

function sendOAuthChallenge(
  req: express.Request,
  res: express.Response,
  message: string,
) {
  res.setHeader(
    "WWW-Authenticate",
    `Bearer resource_metadata="${getProtectedResourceUrl(req)}", scope="${DEFAULT_SCOPES}"`,
  );
  res.status(401).json({ error: message });
}

async function validateBearerToken(token: string): Promise<boolean> {
  const res = await fetch(`${apiBase}/api/auth/mcp/get-session`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    return false;
  }

  const session = (await res.json()) as
    | { userId?: string; scopes?: string }
    | null;

  if (!session?.userId || !session.scopes) {
    return false;
  }

  const scopes = session.scopes
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);

  return scopes.includes("mcp:memories");
}

async function proxyAuthMetadata(
  _req: express.Request,
  res: express.Response,
  path: string,
) {
  const response = await fetch(`${apiBase}/api/auth${path}`, {
    headers: { Accept: "application/json" },
  });

  const body = await response.text();
  const contentType = response.headers.get("content-type") || "application/json";

  res.status(response.status).type(contentType).send(body);
}

app.get("/.well-known/oauth-authorization-server", async (req, res) => {
  try {
    await proxyAuthMetadata(req, res, "/.well-known/oauth-authorization-server");
  } catch {
    res.status(502).json({ error: "Failed to fetch OAuth authorization metadata" });
  }
});

app.get("/.well-known/oauth-protected-resource", async (req, res) => {
  try {
    await proxyAuthMetadata(req, res, "/.well-known/oauth-protected-resource");
  } catch {
    res.status(502).json({ error: "Failed to fetch protected resource metadata" });
  }
});

app.get("/.well-known/oauth-protected-resource/mcp", async (req, res) => {
  try {
    await proxyAuthMetadata(req, res, "/.well-known/oauth-protected-resource");
  } catch {
    res.status(502).json({ error: "Failed to fetch protected resource metadata" });
  }
});

app.post("/mcp", async (req, res) => {
  const apiKey = extractApiKey(req);
  const accessToken = extractBearerToken(req);

  if (!apiKey && !accessToken) {
    sendOAuthChallenge(
      req,
      res,
      "Authentication required. Provide an API key or complete OAuth in Claude.",
    );
    return;
  }

  if (!apiKey && accessToken && !(await validateBearerToken(accessToken))) {
    sendOAuthChallenge(req, res, "Invalid or expired OAuth token.");
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

  const apiClient = createApiClient({
    apiBase,
    apiKey: apiKey || undefined,
    accessToken: accessToken || undefined,
  });
  registerTools(server, apiClient);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch {
    transport.close();
    server.close();
    if (!res.headersSent) {
      const requestId = req.body?.id ?? null;
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: requestId,
      });
    }
  }
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
