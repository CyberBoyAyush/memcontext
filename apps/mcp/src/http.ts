#!/usr/bin/env node
import "./env.js";

import express from "express";
import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from "jose";
import {
  createMcpHandler,
  McpServer,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createApiClient } from "./lib/api-client.js";
import { registerTools } from "./tools.js";

const app = express();
const port = parseInt(process.env.MCP_HTTP_PORT || "3001", 10);
const apiBase = process.env.MEMCONTEXT_API_URL || "https://api.memcontext.in";
// Per MCP spec the challenge names only resource scopes (never offline_access).
const MCP_SCOPE = "mcp:memories";

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Accept, Authorization, DPoP, X-API-Key, MEMCONTEXT-API-Key, Mcp-Session-Id, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
  );
  res.header(
    "Access-Control-Expose-Headers",
    "Mcp-Session-Id, MCP-Protocol-Version, WWW-Authenticate",
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

function extractAccessToken(
  req: express.Request,
): { scheme: "Bearer" | "DPoP"; token: string } | null {
  const match = req.header("authorization")?.match(/^(Bearer|DPoP)\s+(.+)$/i);
  if (!match?.[2]?.trim()) return null;
  return {
    scheme: match[1].toLowerCase() === "dpop" ? "DPoP" : "Bearer",
    token: match[2].trim(),
  };
}

function getRequestOrigin(req: express.Request): string {
  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function getProtectedResourceUrl(req: express.Request): string {
  return `${getRequestOrigin(req)}/.well-known/oauth-protected-resource/mcp`;
}

function getResourceUrl(req: express.Request): string {
  return process.env.MCP_SERVER_URL || `${getRequestOrigin(req)}/mcp`;
}

function sendOAuthChallenge(
  req: express.Request,
  res: express.Response,
  status: 401 | 403,
  error: "invalid_token" | "insufficient_scope" | null,
  message: string,
) {
  const params = [
    ...(error ? [`error="${error}"`, `error_description="${message}"`] : []),
    `scope="${MCP_SCOPE}"`,
    `resource_metadata="${getProtectedResourceUrl(req)}"`,
  ];
  res.setHeader("WWW-Authenticate", `Bearer ${params.join(", ")}`);
  res.status(status).json({ error: error ?? "unauthorized", error_description: message });
}

interface AuthServerMetadata {
  issuer: string;
  jwks_uri: string;
}

let authServer: Promise<{
  issuer: string;
  jwks: ReturnType<typeof createRemoteJWKSet>;
}> | null = null;

function getAuthServer() {
  authServer ??= fetch(`${apiBase}/.well-known/oauth-authorization-server/api/auth`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Authorization server metadata: ${res.status}`);
      const metadata = (await res.json()) as AuthServerMetadata;
      return {
        issuer: metadata.issuer,
        jwks: createRemoteJWKSet(new URL(metadata.jwks_uri)),
      };
    })
    .catch((error: unknown) => {
      authServer = null;
      throw error;
    });
  return authServer;
}

// Validates the access token was issued by MemContext for this MCP resource.
// The API re-checks consent, workspace membership, and revocation per call.
async function verifyAccessToken(
  req: express.Request,
  { scheme, token }: { scheme: "Bearer" | "DPoP"; token: string },
  resource: string,
): Promise<{ authInfo: AuthInfo } | { error: "invalid_token" | "insufficient_scope" }> {
  try {
    const { issuer, jwks } = await getAuthServer();
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: resource });
    const jkt = (payload.cnf as { jkt?: unknown } | undefined)?.jkt;
    const proof = req.header("dpop");
    // DPoP-bound tokens need the DPoP scheme and a proof; the API verifies the
    // forwarded proof (key binding + single use) on every tool call.
    if ((jkt !== undefined || scheme === "DPoP") && (scheme !== "DPoP" || !proof)) {
      return { error: "invalid_token" };
    }

    const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
    if (!scopes.includes(MCP_SCOPE)) return { error: "insufficient_scope" };
    return {
      authInfo: {
        token,
        clientId: typeof payload.azp === "string" ? payload.azp : "",
        scopes,
        expiresAt: payload.exp,
        // Forwarded to the API, which verifies the proof for DPoP-bound tokens.
        extra: jkt !== undefined && proof ? { dpopProof: proof } : undefined,
      },
    };
  } catch (error) {
    if (error instanceof joseErrors.JOSEError) return { error: "invalid_token" };
    throw error;
  }
}

async function proxyAuthMetadata(
  _req: express.Request,
  res: express.Response,
  path: string,
) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { Accept: "application/json" },
  });

  const body = await response.text();
  const contentType = response.headers.get("content-type") || "application/json";

  res.status(response.status).type(contentType).send(body);
}

app.get("/.well-known/oauth-authorization-server", async (req, res) => {
  try {
    await proxyAuthMetadata(req, res, "/.well-known/oauth-authorization-server/api/auth");
  } catch {
    res.status(502).json({ error: "Failed to fetch OAuth authorization metadata" });
  }
});

app.get(
  ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"],
  async (req, res) => {
    try {
      await proxyAuthMetadata(req, res, "/.well-known/oauth-protected-resource/mcp");
    } catch {
      res.status(502).json({ error: "Failed to fetch protected resource metadata" });
    }
  },
);

// Stateless: serves MCP 2026-07-28 plus 2025-era clients (initialize handshake).
const mcpHandler = createMcpHandler(
  ({ authInfo }) => {
    const server = new McpServer({ name: "memcontext", version: "1.0.0" });
    const credentials = authInfo?.extra as
      | { apiKey?: string; dpopProof?: string }
      | undefined;
    registerTools(
      server,
      createApiClient({
        apiBase,
        apiKey: credentials?.apiKey,
        accessToken: credentials?.apiKey ? undefined : authInfo?.token,
        dpopProof: credentials?.dpopProof,
      }),
    );
    return server;
  },
  { legacy: "stateless" },
);

app.all("/mcp", async (req, res) => {
  const apiKey = extractApiKey(req);
  const accessToken = extractAccessToken(req);
  let authInfo: AuthInfo;

  if (apiKey) {
    authInfo = { token: apiKey, clientId: "api-key", scopes: [], extra: { apiKey } };
  } else if (accessToken) {
    try {
      const result = await verifyAccessToken(req, accessToken, getResourceUrl(req));
      if ("error" in result) {
        sendOAuthChallenge(
          req,
          res,
          result.error === "insufficient_scope" ? 403 : 401,
          result.error,
          result.error === "insufficient_scope"
            ? "Token is missing the mcp:memories scope."
            : "Invalid or expired OAuth token.",
        );
        return;
      }
      authInfo = result.authInfo;
    } catch {
      res.status(503).json({ error: "Authorization server unavailable" });
      return;
    }
  } else {
    sendOAuthChallenge(
      req,
      res,
      401,
      null,
      "Authentication required. Provide an API key or connect with OAuth.",
    );
    return;
  }

  await toNodeHandler({
    fetch: (request, options) => mcpHandler.fetch(request, { ...options, authInfo }),
  })(req, res, req.body);
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
