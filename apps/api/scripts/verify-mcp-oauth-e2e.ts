/**
 * End-to-end verification of MCP OAuth (Better Auth 1.7 + MCP 2026-07-28).
 *
 * Requires the API (BETTER_AUTH_URL) and MCP HTTP server (MCP_SERVER_URL)
 * running against a NON-production database. Creates a throwaway user,
 * exercises CIMD/DCR clients end to end, and removes everything it created.
 *
 *   cd apps/api && npx tsx scripts/verify-mcp-oauth-e2e.ts
 */
import {
  createHash,
  createHmac,
  generateKeyPairSync,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { request as httpRequest } from "node:http";
import { and, eq, inArray } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import {
  StdioClientTransport,
  getDefaultEnvironment,
} from "@modelcontextprotocol/client/stdio";
import { env } from "../src/env.js";
import { auth } from "../src/lib/auth.js";
import { verifyMcpAccessToken } from "../src/lib/mcp-oauth.js";
import {
  db,
  subscriptions,
  workspaceMembers,
  workspaces,
} from "../src/db/index.js";
import {
  oauthClient,
  oauthConsent,
  user as userTable,
} from "../src/db/auth-schema.js";
import { getOrCreateDefaultWorkspace } from "../src/services/subscription.js";

if (
  env.NODE_ENV === "production" ||
  !env.DATABASE_URL.includes("misty-cherry")
) {
  throw new Error(
    "Refusing to run: verify-mcp-oauth-e2e only runs against the dev database",
  );
}

const API = env.BETTER_AUTH_URL;
const MCP_URL = env.MCP_SERVER_URL;
const DASHBOARD = env.DASHBOARD_URL;
const ISSUER = new URL("/api/auth", API).toString();
const EXPECTED_TOOLS = [
  "delete_memory",
  "memory_feedback",
  "save_memory",
  "search_memory",
  "update_memory",
];

interface CheckResult {
  name: string;
  ok: boolean;
  details: string;
}
const results: CheckResult[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    results.push({ name, ok: true, details: (await fn()) || "ok" });
  } catch (error) {
    results.push({
      name,
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function decodeJwt(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

// ---------- fixtures ----------
const ctx = await auth.$context;
const email = `mcp-e2e-${randomUUID().slice(0, 8)}@example.test`;
const testUser = await ctx.internalAdapter.createUser(
  { email, name: "MCP E2E", emailVerified: true },
  { method: "admin" },
);
const session = await ctx.internalAdapter.createSession(testUser.id);
const signature = createHmac("sha256", ctx.secret)
  .update(session.token)
  .digest("base64");
const cookie = `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${session.token}.${signature}`)}`;
const workspaceA = await getOrCreateDefaultWorkspace(testUser.id);
const [workspaceBRow] = await db
  .insert(workspaces)
  .values({
    name: "MCP E2E Second",
    slug: `mcp-e2e-second-${randomUUID().slice(0, 8)}`,
    createdByUserId: testUser.id,
    billingOwnerUserId: testUser.id,
    updatedAt: new Date(),
  })
  .returning({ id: workspaces.id });
const workspaceB = workspaceBRow.id;
await db
  .insert(workspaceMembers)
  .values({ workspaceId: workspaceB, userId: testUser.id, role: "owner" });
// Seed B's subscription up front (dev DB still carries a legacy unique(user_id)).
await db
  .insert(subscriptions)
  .values({ userId: `mcp-e2e-billing-${workspaceB}`, workspaceId: workspaceB });

const sessionHeaders = {
  Cookie: cookie,
  Origin: DASHBOARD,
  "Content-Type": "application/json",
};

async function selectWorkspace(workspaceId: string) {
  const res = await fetch(`${API}/api/user/mcp-workspace`, {
    method: "POST",
    headers: sessionHeaders,
    body: JSON.stringify({ workspaceId }),
  });
  assert(res.ok, `select workspace failed: ${res.status} ${await res.text()}`);
}

async function registerClient(metadata: Record<string, unknown>) {
  const res = await fetch(`${API}/api/auth/oauth2/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://client.example",
    },
    body: JSON.stringify(metadata),
  });
  const body = (await res.json()) as Record<string, unknown>;
  return { status: res.status, body };
}

function navigate(
  url: URL,
  cookieHeader: string,
): Promise<{ status: number; location: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      url,
      {
        headers: {
          Cookie: cookieHeader,
          Accept: "text/html",
          "Sec-Fetch-Mode": "navigate",
        },
      },
      (res) => {
        res.resume();
        resolve({
          status: res.statusCode ?? 0,
          location: res.headers.location ?? "",
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

interface FlowOptions {
  clientId: string;
  redirectUri: string;
  workspaceId: string;
  sendResource?: boolean;
  expectRefresh?: boolean;
}

interface TokenSet {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  expires_in: number;
}

async function authorize({
  clientId,
  redirectUri,
  workspaceId,
  sendResource = true,
}: FlowOptions) {
  const { verifier, challenge } = pkce();
  const state = randomBytes(12).toString("base64url");
  await selectWorkspace(workspaceId);

  const url = new URL(`${ISSUER}/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "mcp:memories");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (sendResource) url.searchParams.set("resource", MCP_URL);

  // Browser top-level navigation must get a real 302 (undici fetch would
  // force Sec-Fetch-Mode: cors, so use a raw HTTP request).
  const { status, location } = await navigate(url, cookie);
  assert(status === 302 && location, `authorize expected 302, got ${status}`);

  let callback: URL;
  if (location.startsWith(`${DASHBOARD}/oauth/consent`)) {
    const consentUrl = new URL(location);
    const consent = await fetch(`${ISSUER}/oauth2/consent`, {
      method: "POST",
      headers: sessionHeaders,
      body: JSON.stringify({
        accept: true,
        oauth_query: consentUrl.search.slice(1),
      }),
    });
    const body = (await consent.json()) as { url?: string };
    assert(
      consent.ok && body.url,
      `consent failed: ${consent.status} ${JSON.stringify(body)}`,
    );
    callback = new URL(body.url);
  } else {
    callback = new URL(location);
  }

  assert(callback.searchParams.get("state") === state, "state mismatch");
  assert(
    callback.searchParams.get("iss") === ISSUER,
    `iss mismatch: ${callback.searchParams.get("iss")}`,
  );
  const code = callback.searchParams.get("code");
  assert(code, `no code in callback: ${callback}`);
  return { code, verifier, consentLocation: location };
}

async function exchangeCode(options: FlowOptions) {
  const { code, verifier, consentLocation } = await authorize(options);
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: options.redirectUri,
    client_id: options.clientId,
    code_verifier: verifier,
  });
  if (options.sendResource !== false) form.set("resource", MCP_URL);
  const res = await fetch(`${ISSUER}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const tokens = (await res.json()) as TokenSet;
  assert(
    res.ok,
    `token exchange failed: ${res.status} ${JSON.stringify(tokens)}`,
  );

  const claims = decodeJwt(tokens.access_token);
  assert(claims.aud === MCP_URL, `aud mismatch: ${String(claims.aud)}`);
  assert(claims.iss === ISSUER, `iss mismatch: ${String(claims.iss)}`);
  assert(
    claims.workspace_id === options.workspaceId,
    "workspace claim mismatch",
  );
  assert(
    String(claims.scope).split(" ").includes("mcp:memories"),
    "missing mcp:memories scope",
  );
  if (options.expectRefresh !== false) {
    assert(
      tokens.refresh_token,
      "no refresh_token issued (offline_access missing)",
    );
  }
  return { tokens, claims, consentLocation };
}

async function mcpClient(headers: Record<string, string>, modern: boolean) {
  const client = new Client(
    { name: "memcontext-e2e", version: "1.0.0" },
    modern ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {},
  );
  await client.connect(
    new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: { headers },
    }),
  );
  return client;
}

async function listToolNames(headers: Record<string, string>, modern: boolean) {
  const client = await mcpClient(headers, modern);
  try {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    assert(
      JSON.stringify(names) === JSON.stringify(EXPECTED_TOOLS),
      `tools: ${names.join(",")}`,
    );
    return names;
  } finally {
    await client.close();
  }
}

async function apiStatusWithBearer(token: string, dpopProof?: string) {
  const res = await fetch(`${API}/api/memories/graph`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...(dpopProof ? { DPoP: dpopProof } : {}),
    },
  });
  return res.status;
}

const createdClientIds: string[] = [];
let claude: { tokens: TokenSet; claims: Record<string, unknown> } | null = null;
let codex: { tokens: TokenSet } | null = null;

try {
  // ---------- discovery ----------
  await check(
    "MCP 401 challenge advertises PRM + resource scope only",
    async () => {
      const res = await fetch(MCP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      });
      const challenge = res.headers.get("www-authenticate") ?? "";
      assert(res.status === 401, `status ${res.status}`);
      assert(
        challenge.includes(
          `resource_metadata="${new URL(MCP_URL).origin}/.well-known/oauth-protected-resource/mcp"`,
        ),
        challenge,
      );
      assert(
        challenge.includes('scope="mcp:memories"') &&
          !challenge.includes("offline_access"),
        challenge,
      );
      return challenge;
    },
  );

  await check(
    "Protected resource metadata (RFC 9728) on MCP host",
    async () => {
      for (const path of [
        "/.well-known/oauth-protected-resource/mcp",
        "/.well-known/oauth-protected-resource",
      ]) {
        const prm = (await (
          await fetch(new URL(path, MCP_URL))
        ).json()) as Record<string, unknown>;
        assert(
          prm.resource === MCP_URL,
          `${path} resource ${String(prm.resource)}`,
        );
        assert(
          JSON.stringify(prm.authorization_servers) ===
            JSON.stringify([ISSUER]),
          `${path} AS`,
        );
        assert(
          JSON.stringify(prm.scopes_supported) ===
            JSON.stringify(["mcp:memories"]),
          `${path} scopes`,
        );
      }
    },
  );

  await check(
    "Authorization server metadata (RFC 8414 path-inserted + issuer-relative)",
    async () => {
      for (const url of [
        `${new URL(API).origin}/.well-known/oauth-authorization-server/api/auth`,
        `${ISSUER}/.well-known/oauth-authorization-server`,
      ]) {
        const meta = (await (await fetch(url)).json()) as Record<
          string,
          unknown
        >;
        assert(meta.issuer === ISSUER, `issuer ${String(meta.issuer)}`);
        assert(
          meta.client_id_metadata_document_supported === true,
          "CIMD not advertised",
        );
        assert(
          meta.authorization_response_iss_parameter_supported === true,
          "RFC 9207 iss not advertised",
        );
        assert(
          JSON.stringify(meta.code_challenge_methods_supported) === '["S256"]',
          "PKCE S256",
        );
        assert(
          (meta.token_endpoint_auth_methods_supported as string[]).includes(
            "none",
          ),
          "public clients",
        );
        assert(typeof meta.registration_endpoint === "string", "DCR endpoint");
        assert(
          (meta.scopes_supported as string[]).includes("offline_access"),
          "offline_access",
        );
      }
    },
  );

  await check(
    "Public OAuth endpoints allow browser clients (CORS)",
    async () => {
      const jwks = await fetch(`${ISSUER}/jwks`, {
        headers: { Origin: "https://inspector.example" },
      });
      assert(
        jwks.ok && jwks.headers.get("access-control-allow-origin") === "*",
        "jwks CORS",
      );
      const preflight = await fetch(`${ISSUER}/oauth2/token`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://inspector.example",
          "Access-Control-Request-Method": "POST",
        },
      });
      assert(
        preflight.headers.get("access-control-allow-origin") === "*",
        "token preflight CORS",
      );
      const app = await fetch(`${API}/api/memories`, {
        headers: { Origin: "https://evil.example" },
      });
      assert(
        app.headers.get("access-control-allow-origin") === null,
        "app routes must stay locked",
      );
    },
  );

  await check(
    "Core Better Auth regressions (session, captcha, Dodo webhooks)",
    async () => {
      const sessionRes = await fetch(`${ISSUER}/get-session`, {
        headers: { Cookie: cookie },
      });
      const sessionBody = (await sessionRes.json()) as {
        user?: { email?: string };
      } | null;
      assert(
        sessionBody?.user?.email === email,
        `get-session: ${sessionRes.status}`,
      );
      const signIn = await fetch(`${ISSUER}/sign-in/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: DASHBOARD },
        body: JSON.stringify({ email, password: "irrelevant-password" }),
      });
      assert(
        signIn.status === 400 || signIn.status === 403,
        `captcha must guard sign-in: ${signIn.status}`,
      );
      const webhook = await fetch(`${ISSUER}/dodopayments/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription.active", data: {} }),
      });
      assert(
        webhook.status >= 400 && webhook.status < 500,
        `unsigned webhook: ${webhook.status}`,
      );
    },
  );

  // ---------- CIMD clients ----------
  await check(
    "Claude (CIMD) authorize → consent → token with refresh",
    async () => {
      const flow = await exchangeCode({
        clientId: "https://claude.ai/oauth/mcp-oauth-client-metadata",
        redirectUri: "https://claude.ai/api/mcp/auth_callback",
        workspaceId: workspaceA,
      });
      const consentScope =
        new URL(flow.consentLocation).searchParams.get("scope") ?? "";
      assert(
        consentScope.split(" ").includes("offline_access"),
        `consent scope: ${consentScope}`,
      );
      claude = flow;
      return `scope=${flow.tokens.scope} expires_in=${flow.tokens.expires_in}`;
    },
  );

  await check("Claude Code (CIMD, loopback with ephemeral port)", async () => {
    const flow = await exchangeCode({
      clientId: "https://claude.ai/oauth/claude-code-client-metadata",
      redirectUri: "http://127.0.0.1:53682/callback",
      workspaceId: workspaceA,
    });
    return `scope=${flow.tokens.scope}`;
  });

  // ---------- DCR clients ----------
  const dcrClients: Array<{
    label: string;
    metadata: Record<string, unknown>;
    redirectUri: string;
    sendResource?: boolean;
  }> = [
    {
      label: "Codex CLI (DCR loopback, no application_type, no resource param)",
      redirectUri: "http://127.0.0.1:1455/callback",
      sendResource: false,
      metadata: {
        client_name: "Codex",
        redirect_uris: ["http://127.0.0.1:1455/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
    },
    {
      label: "ChatGPT (DCR web redirect)",
      redirectUri: "https://chatgpt.com/connector_platform_oauth_redirect",
      metadata: {
        client_name: "ChatGPT",
        redirect_uris: [
          "https://chatgpt.com/connector_platform_oauth_redirect",
        ],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: "mcp:memories",
      },
    },
    {
      label: "OpenCode (DCR loopback)",
      redirectUri: "http://127.0.0.1:19876/mcp/oauth/callback",
      metadata: {
        client_name: "opencode",
        redirect_uris: ["http://127.0.0.1:19876/mcp/oauth/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
    },
    {
      label: "VS Code (DCR native)",
      redirectUri: "http://127.0.0.1:33418",
      metadata: {
        client_name: "Visual Studio Code",
        application_type: "native",
        redirect_uris: [
          "http://127.0.0.1:33418",
          "https://vscode.dev/redirect",
        ],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
    },
    {
      label: "Cursor (DCR cursor:// custom scheme)",
      redirectUri: "cursor://anysphere.cursor-mcp/oauth/callback",
      metadata: {
        client_name: "Cursor",
        redirect_uris: ["cursor://anysphere.cursor-mcp/oauth/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
    },
    {
      label: "Grok-style (DCR web redirect)",
      redirectUri: "https://grok.com/oauth/callback",
      metadata: {
        client_name: "Grok",
        redirect_uris: ["https://grok.com/oauth/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      },
    },
  ];

  for (const dcr of dcrClients) {
    await check(dcr.label, async () => {
      const registered = await registerClient(dcr.metadata);
      assert(
        registered.status === 200 || registered.status === 201,
        `register ${registered.status}: ${JSON.stringify(registered.body)}`,
      );
      const clientId = String(registered.body.client_id);
      createdClientIds.push(clientId);
      const flow = await exchangeCode({
        clientId,
        redirectUri: dcr.redirectUri,
        workspaceId: dcr.label.startsWith("ChatGPT") ? workspaceB : workspaceA,
        sendResource: dcr.sendResource,
      });
      if (dcr.label.startsWith("Codex")) codex = flow;
      return `client=${clientId.slice(0, 8)}… scope=${flow.tokens.scope}`;
    });
  }

  // ---------- MCP transport (both protocol eras) ----------
  await check(
    "MCP over OAuth: 2025-era client (initialize) lists tools",
    async () => {
      assert(claude, "claude flow failed");
      return (
        await listToolNames(
          { Authorization: `Bearer ${claude.tokens.access_token}` },
          false,
        )
      ).join(",");
    },
  );

  await check(
    "MCP over OAuth: 2026-07-28 client (server/discover) lists tools",
    async () => {
      assert(codex, "codex flow failed");
      return (
        await listToolNames(
          { Authorization: `Bearer ${codex.tokens.access_token}` },
          true,
        )
      ).join(",");
    },
  );

  await check(
    "MCP over OAuth: tool call reaches API with grant workspace",
    async () => {
      assert(claude, "claude flow failed");
      const client = await mcpClient(
        { Authorization: `Bearer ${claude.tokens.access_token}` },
        true,
      );
      try {
        const result = await client.callTool({
          name: "search_memory",
          arguments: { query: "What does the user prefer for testing?" },
        });
        const text = JSON.stringify(result.content);
        assert(!result.isError, `tool error: ${text}`);
        return text.slice(0, 80);
      } finally {
        await client.close();
      }
    },
  );

  // ---------- persistence ----------
  await check(
    "Refresh token grant keeps audience + workspace and rotates",
    async () => {
      assert(claude?.tokens.refresh_token, "no claude refresh token");
      const res = await fetch(`${ISSUER}/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: claude.tokens.refresh_token,
          client_id: "https://claude.ai/oauth/mcp-oauth-client-metadata",
        }),
      });
      const refreshed = (await res.json()) as TokenSet;
      assert(
        res.ok,
        `refresh failed: ${res.status} ${JSON.stringify(refreshed)}`,
      );
      const claims = decodeJwt(refreshed.access_token);
      assert(
        claims.aud === MCP_URL && claims.workspace_id === workspaceA,
        "refreshed claims",
      );
      assert(
        refreshed.refresh_token &&
          refreshed.refresh_token !== claude.tokens.refresh_token,
        "refresh token not rotated",
      );
      await listToolNames(
        { Authorization: `Bearer ${refreshed.access_token}` },
        true,
      );
      claude = { tokens: refreshed, claims };
      return `refresh ttl≈30d, access expires_in=${refreshed.expires_in}`;
    },
  );

  // ---------- workspace binding & revocation ----------
  await check("Grants stay bound to their consented workspace", async () => {
    assert(claude, "claude flow failed");
    await selectWorkspace(workspaceB);
    const grant = await verifyMcpAccessToken(claude.tokens.access_token);
    assert(
      grant?.workspaceId === workspaceA,
      `claude grant workspace ${grant?.workspaceId}`,
    );
    assert(
      (await apiStatusWithBearer(claude.tokens.access_token)) === 200,
      "api rejected valid grant",
    );
    return "selection change does not move existing connections";
  });

  await check(
    "Revoked consent and removed membership are rejected immediately",
    async () => {
      const [chatgptConsent] = await db
        .select({ id: oauthConsent.id, clientId: oauthConsent.clientId })
        .from(oauthConsent)
        .where(
          and(
            eq(oauthConsent.userId, testUser.id),
            eq(oauthConsent.referenceId, workspaceB),
          ),
        )
        .limit(1);
      assert(chatgptConsent, "no consent for workspace B");
      const token = (
        await exchangeCode({
          clientId: chatgptConsent.clientId,
          redirectUri: "https://chatgpt.com/connector_platform_oauth_redirect",
          workspaceId: workspaceB,
        })
      ).tokens.access_token;
      const freshStatus = await apiStatusWithBearer(token);
      assert(freshStatus === 200, `fresh token rejected: ${freshStatus}`);
      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceB),
            eq(workspaceMembers.userId, testUser.id),
          ),
        );
      assert(
        (await apiStatusWithBearer(token)) === 401,
        "token accepted after membership removal",
      );
      await db.insert(workspaceMembers).values({
        workspaceId: workspaceB,
        userId: testUser.id,
        role: "owner",
      });
      await db
        .delete(oauthConsent)
        .where(eq(oauthConsent.id, chatgptConsent.id));
      assert(
        (await apiStatusWithBearer(token)) === 401,
        "token accepted after consent revoked",
      );
    },
  );

  // ---------- dashboard connection management ----------
  await check("Connections API lists and disconnects clients", async () => {
    assert(codex?.tokens.refresh_token, "codex flow failed");
    const listUrl = `${API}/api/mcp-connections?workspaceId=${workspaceA}`;
    const list = (await (
      await fetch(listUrl, { headers: sessionHeaders })
    ).json()) as {
      canManageAll: boolean;
      connections: Array<{
        id: string;
        clientId: string;
        clientName: string | null;
        lastActiveAt: string;
      }>;
    };
    const codexClientId = String(
      decodeJwt(codex.tokens.access_token).client_id,
    );
    const codexConnection = list.connections.find(
      (x) => x.clientId === codexClientId,
    );
    assert(list.canManageAll, "owner should manage all connections");
    assert(codexConnection?.clientName === "Codex", "codex connection missing");
    assert(
      list.connections.every((x) => x.lastActiveAt),
      "lastActiveAt missing",
    );

    const outsider = await fetch(
      `${API}/api/mcp-connections?workspaceId=${randomUUID()}`,
      {
        headers: sessionHeaders,
      },
    );
    assert(outsider.status === 404, `non-member workspace: ${outsider.status}`);

    const removed = await fetch(
      `${API}/api/mcp-connections/${codexConnection.id}?workspaceId=${workspaceA}`,
      { method: "DELETE", headers: sessionHeaders },
    );
    assert(removed.ok, `disconnect failed: ${removed.status}`);
    assert(
      (await apiStatusWithBearer(codex.tokens.access_token)) === 401,
      "access token survived disconnect",
    );
    const refresh = await fetch(`${ISSUER}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: codex.tokens.refresh_token,
        client_id: codexClientId,
      }),
    });
    assert(!refresh.ok, "refresh token survived disconnect");
    return `${list.connections.length} connections listed`;
  });

  // ---------- negative cases ----------
  await check(
    "Tampered, wrong-audience, and DPoP-misused tokens are rejected",
    async () => {
      assert(claude, "claude flow failed");
      const token = claude.tokens.access_token;
      const tampered = `${token.slice(0, -4)}${token.slice(-4) === "AAAA" ? "BBBB" : "AAAA"}`;
      const signJWT = (
        auth.api as unknown as {
          signJWT: (args: {
            body: { payload: Record<string, unknown> };
          }) => Promise<{ token: string }>;
        }
      ).signJWT;
      const now = Math.floor(Date.now() / 1000);
      const wrongAud = (
        await signJWT({
          body: {
            payload: {
              ...claude.claims,
              aud: "https://evil.example/mcp",
              iat: now,
              exp: now + 300,
            },
          },
        })
      ).token;
      for (const [label, header] of [
        ["tampered", `Bearer ${tampered}`],
        ["wrong-aud", `Bearer ${wrongAud}`],
        ["garbage", "Bearer not-a-jwt"],
        ["dpop-without-proof", `DPoP ${token}`],
      ] as const) {
        const res = await fetch(MCP_URL, {
          method: "POST",
          headers: {
            Authorization: header,
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        });
        assert(
          res.status === 401 &&
            (res.headers.get("www-authenticate") ?? "").includes(
              'error="invalid_token"',
            ),
          `${label}: ${res.status}`,
        );
      }
      assert(
        (await apiStatusWithBearer(wrongAud)) === 401,
        "API accepted wrong-audience token",
      );
    },
  );

  await check("DPoP-bound access token works end to end", async () => {
    assert(claude, "claude flow failed");
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const jwk = publicKey.export({ format: "jwk" });
    const { SignJWT, importJWK, calculateJwkThumbprint } = await import("jose");
    const key = await importJWK(privateKey.export({ format: "jwk" }), "EdDSA");
    const proof = (
      htm: string,
      htu: string,
      extra: Record<string, unknown> = {},
    ) =>
      new SignJWT({ htm, htu, jti: randomUUID(), ...extra })
        .setProtectedHeader({ alg: "EdDSA", typ: "dpop+jwt", jwk })
        .setIssuedAt()
        .sign(key);

    const registered = await registerClient({
      client_name: "DPoP Client",
      redirect_uris: ["http://127.0.0.1:4567/cb"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
    const clientId = String(registered.body.client_id);
    createdClientIds.push(clientId);
    const { code, verifier } = await authorize({
      clientId,
      redirectUri: "http://127.0.0.1:4567/cb",
      workspaceId: workspaceA,
    });
    const tokenRes = await fetch(`${ISSUER}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        DPoP: await proof("POST", `${ISSUER}/oauth2/token`),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "http://127.0.0.1:4567/cb",
        client_id: clientId,
        code_verifier: verifier,
        resource: MCP_URL,
      }),
    });
    const tokens = (await tokenRes.json()) as TokenSet;
    assert(
      tokenRes.ok && tokens.token_type === "DPoP",
      `dpop token: ${JSON.stringify(tokens)}`,
    );
    const claims = decodeJwt(tokens.access_token) as { cnf?: { jkt?: string } };
    assert(claims.cnf?.jkt === (await calculateJwkThumbprint(jwk)), "cnf.jkt");

    const ath = createHash("sha256")
      .update(tokens.access_token)
      .digest("base64url");
    const call = async (authorization: string, dpop?: string) =>
      (
        await fetch(MCP_URL, {
          method: "POST",
          headers: {
            Authorization: authorization,
            ...(dpop ? { DPoP: dpop } : {}),
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-06-18",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-06-18",
              capabilities: {},
              clientInfo: { name: "dpop", version: "1" },
            },
          }),
        })
      ).status;
    const goodProof = await proof("POST", MCP_URL, { ath });
    assert(
      (await call(`DPoP ${tokens.access_token}`, goodProof)) === 200,
      "valid DPoP proof rejected",
    );
    // The API (which every tool call goes through) enforces key binding and
    // single use of the forwarded proof.
    const otherKey = await importJWK(
      generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" }),
      "EdDSA",
    );
    const forgedProof = await new SignJWT({
      htm: "POST",
      htu: MCP_URL,
      jti: randomUUID(),
      ath,
    })
      .setProtectedHeader({ alg: "EdDSA", typ: "dpop+jwt", jwk })
      .setIssuedAt()
      .sign(otherKey);
    assert(
      (await apiStatusWithBearer(tokens.access_token, forgedProof)) === 401,
      "API accepted a DPoP proof not signed by the bound key",
    );
    assert(
      (await apiStatusWithBearer(tokens.access_token, goodProof)) === 200,
      "API rejected a valid forwarded DPoP proof",
    );
    assert(
      (await apiStatusWithBearer(tokens.access_token, goodProof)) === 401,
      "API accepted a replayed DPoP proof",
    );
    assert(
      (await call(`Bearer ${tokens.access_token}`)) === 401,
      "DPoP-bound token accepted as bearer",
    );

    // Stolen DPoP-bound token used directly against the API without a proof.
    assert(
      (await apiStatusWithBearer(tokens.access_token)) === 401,
      "API accepted DPoP-bound token without proof",
    );

    // Full tool call through MCP with a fresh proof per request; the API
    // re-verifies the forwarded proof (single use, DB-backed replay store).
    const dpopClient = new Client(
      { name: "dpop-e2e", version: "1.0.0" },
      { versionNegotiation: { mode: { pin: "2026-07-28" } } },
    );
    await dpopClient.connect(
      new StreamableHTTPClientTransport(new URL(MCP_URL), {
        fetch: async (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("Authorization", `DPoP ${tokens.access_token}`);
          headers.set(
            "DPoP",
            await proof(init?.method ?? "GET", MCP_URL, { ath }),
          );
          return fetch(input, { ...init, headers });
        },
      }),
    );
    try {
      const result = await dpopClient.callTool({
        name: "search_memory",
        arguments: { query: "Does DPoP work end to end?" },
      });
      assert(
        !result.isError,
        `DPoP tool call failed: ${JSON.stringify(result.content)}`,
      );
    } finally {
      await dpopClient.close();
    }
  });

  // ---------- API keys keep working ----------
  await check(
    "API key clients work on both protocol eras (HTTP + stdio)",
    async () => {
      const res = await fetch(`${API}/api/api-keys`, {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({ name: "mcp-e2e", workspaceId: workspaceA }),
      });
      const body = (await res.json()) as { key?: string };
      assert(
        res.ok && body.key,
        `api key create failed: ${res.status} ${JSON.stringify(body)}`,
      );
      await listToolNames({ "X-API-Key": body.key }, false);
      await listToolNames({ "MEMCONTEXT-API-Key": body.key }, true);
      const client = await mcpClient({ "X-API-Key": body.key }, true);
      try {
        const result = await client.callTool({
          name: "search_memory",
          arguments: { query: "Does the API key path work?" },
        });
        assert(
          !result.isError,
          `api key tool call failed: ${JSON.stringify(result.content)}`,
        );
      } finally {
        await client.close();
      }
      for (const mode of ["legacy", "auto"] as const) {
        const stdio = new Client(
          { name: "memcontext-e2e-stdio", version: "1.0.0" },
          { versionNegotiation: { mode } },
        );
        await stdio.connect(
          new StdioClientTransport({
            command: "npx",
            args: ["tsx", "src/index.ts"],
            cwd: fileURLToPath(new URL("../../mcp", import.meta.url)),
            env: {
              ...getDefaultEnvironment(),
              MEMCONTEXT_API_KEY: body.key,
              MEMCONTEXT_API_URL: API,
            },
            stderr: "ignore",
          }),
        );
        try {
          const names = (await stdio.listTools()).tools
            .map((tool) => tool.name)
            .sort();
          assert(
            JSON.stringify(names) === JSON.stringify(EXPECTED_TOOLS),
            `stdio ${mode} tools: ${names}`,
          );
          const result = await stdio.callTool({
            name: "search_memory",
            arguments: { query: "Does stdio work?" },
          });
          assert(
            !result.isError,
            `stdio ${mode} tool call failed: ${JSON.stringify(result.content)}`,
          );
        } finally {
          await stdio.close();
        }
      }
      const bad = await mcpClient({ "X-API-Key": "mc_invalid" }, true);
      try {
        const result = await bad.callTool({
          name: "search_memory",
          arguments: { query: "x" },
        });
        assert(result.isError, "invalid API key should fail tool calls");
      } finally {
        await bad.close();
      }
    },
  );
} finally {
  // ---------- cleanup ----------
  // Only this run's DCR clients and user; shared CIMD clients (e.g. Claude) are
  // left in place, and the user's consents/tokens on them cascade with the user.
  if (createdClientIds.length)
    await db
      .delete(oauthClient)
      .where(inArray(oauthClient.clientId, createdClientIds));
  await db
    .delete(workspaces)
    .where(inArray(workspaces.id, [workspaceA, workspaceB]));
  await db.delete(userTable).where(eq(userTable.id, testUser.id));
  const leftovers = await db
    .select({ id: oauthConsent.id })
    .from(oauthConsent)
    .where(eq(oauthConsent.userId, testUser.id));
  results.push({
    name: "Cleanup removed all test data",
    ok: leftovers.length === 0,
    details: `${leftovers.length} leftover consents`,
  });
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(
    `${result.ok ? "PASS" : "FAIL"}  ${result.name}${result.ok ? "" : `\n      → ${result.details}`}`,
  );
}
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed`,
);
process.exit(failed.length ? 1 : 0);
