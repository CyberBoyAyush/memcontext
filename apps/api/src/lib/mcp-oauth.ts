import { and, eq } from "drizzle-orm";
import {
  createDpopReplayStore,
  getDpopJktFromPayload,
  verifyDpopProof,
  verifyJwsAccessToken,
} from "better-auth/oauth2";
import { db } from "../db/index.js";
import { oauthClient, oauthConsent } from "../db/auth-schema.js";
import {
  MCP_SCOPE,
  MCP_WORKSPACE_CLAIM,
  isWorkspaceMember,
} from "../services/mcp-workspace.js";
import { env } from "../env.js";
import { auth } from "./auth.js";
import { logger } from "./logger.js";

const OFFLINE_ACCESS = "offline_access";
const jwksCacheKey = {};

export interface McpGrant {
  userId: string;
  workspaceId: string;
  clientId: string;
}

async function allowsOfflineAccess(clientId: string) {
  const [client] = await db
    .select({ scopes: oauthClient.scopes, grantTypes: oauthClient.grantTypes })
    .from(oauthClient)
    .where(eq(oauthClient.clientId, clientId))
    .limit(1);
  // An unknown https client_id is a Client ID Metadata Document client (e.g.
  // Claude) on first contact; Better Auth registers it during this request.
  if (!client) return clientId.startsWith("https://");
  return (
    (!client.scopes || client.scopes.includes(OFFLINE_ACCESS)) &&
    Boolean(client.grantTypes?.includes("refresh_token"))
  );
}

/**
 * A DCR client asking for the refresh_token grant but pinning a scope without
 * offline_access could never receive refresh tokens; widen its scope.
 */
async function normalizeRegistrationRequest(
  request: Request,
): Promise<Request> {
  if (!new URL(request.url).pathname.endsWith("/oauth2/register"))
    return request;
  const body = (await request
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.scope !== "string" ||
    !Array.isArray(body.grant_types) ||
    !body.grant_types.includes("refresh_token")
  ) {
    return request;
  }

  const scopes = body.scope.split(" ").filter(Boolean);
  if (scopes.includes(OFFLINE_ACCESS)) return request;

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...body,
      scope: [...scopes, OFFLINE_ACCESS].join(" "),
    }),
  });
}

/**
 * Normalizes MCP client OAuth requests before Better Auth handles them.
 * For the initial (unsigned) /oauth2/authorize request:
 * - Clients request the scopes from the resource challenge, which (per spec)
 *   never includes offline_access, so no refresh token would be issued and
 *   users would re-authorize every hour. Add it for refresh-capable clients.
 * - Some clients omit the RFC 8707 resource; this server only protects the
 *   MCP resource, so bind the grant to it (otherwise tokens are not MCP JWTs).
 */
export async function normalizeMcpOAuthRequest(
  request: Request,
): Promise<Request> {
  if (request.method === "POST") return normalizeRegistrationRequest(request);
  if (request.method !== "GET") return request;
  const url = new URL(request.url);
  if (
    !url.pathname.endsWith("/oauth2/authorize") ||
    url.searchParams.has("sig")
  ) {
    return request;
  }

  const clientId = url.searchParams.get("client_id");
  const scope = url.searchParams.get("scope");
  const scopes = (scope ?? "").split(" ").filter(Boolean);
  if (!clientId || (scope !== null && !scopes.includes(MCP_SCOPE)))
    return request;

  let changed = false;
  if (!url.searchParams.has("resource")) {
    url.searchParams.set("resource", env.MCP_SERVER_URL);
    changed = true;
  }

  if (scope !== null && !scopes.includes(OFFLINE_ACCESS)) {
    try {
      if (await allowsOfflineAccess(clientId)) {
        url.searchParams.set("scope", [...scopes, OFFLINE_ACCESS].join(" "));
        changed = true;
      }
    } catch (error) {
      logger.warn({ clientId, error }, "mcp offline_access check failed");
    }
  }

  return changed ? new Request(url, request) : request;
}

/**
 * Verifies an MCP OAuth access token (JWT bound to the MCP resource) and
 * resolves the grant's workspace. Returns null for anything not acceptable.
 */
export async function verifyMcpAccessToken(
  token: string,
  dpopProof?: string,
): Promise<McpGrant | null> {
  try {
    const ctx = await auth.$context;
    const { baseURL } = ctx;
    const payload = await verifyJwsAccessToken(token, {
      jwksFetch: () => auth.api.getJwks(),
      jwksCacheKey,
      verifyOptions: { issuer: baseURL, audience: env.MCP_SERVER_URL },
    });

    const scopes =
      typeof payload.scope === "string" ? payload.scope.split(" ") : [];
    const userId = payload.sub;
    const clientId = payload.client_id;
    const workspaceId = payload[MCP_WORKSPACE_CLAIM];
    if (
      !scopes.includes(MCP_SCOPE) ||
      typeof userId !== "string" ||
      typeof clientId !== "string" ||
      typeof workspaceId !== "string" ||
      typeof payload.iat !== "number"
    ) {
      return null;
    }

    // DPoP-bound tokens are only usable with a fresh proof from the key holder.
    // The MCP server forwards the client's proof (minted for the MCP resource);
    // the DB-backed replay store makes each proof single-use across instances.
    const jkt = getDpopJktFromPayload(payload);
    if (jkt) {
      if (!dpopProof) return null;
      await verifyDpopProof({
        proofJwt: dpopProof,
        method: "POST",
        url: env.MCP_SERVER_URL,
        accessToken: token,
        expectedJkt: jkt,
        requireAth: true,
        replayStore: createDpopReplayStore(ctx.internalAdapter),
      });
    }

    // JWTs are not revocable: require the consent that minted this token to
    // still exist, and reject tokens minted before a later re-consent.
    const [consent] = await db
      .select({ createdAt: oauthConsent.createdAt })
      .from(oauthConsent)
      .where(
        and(
          eq(oauthConsent.clientId, clientId),
          eq(oauthConsent.userId, userId),
          eq(oauthConsent.referenceId, workspaceId),
        ),
      )
      .limit(1);
    if (
      !consent ||
      Math.floor(consent.createdAt.getTime() / 1000) > payload.iat
    )
      return null;

    if (!(await isWorkspaceMember(userId, workspaceId))) return null;

    return { userId, workspaceId, clientId };
  } catch {
    return null;
  }
}
