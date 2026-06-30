import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

type ExpectedStatus = number | number[];

interface TestResult {
  name: string;
  status: number;
  expected: ExpectedStatus;
  ok: boolean;
}

interface JsonRecord {
  [key: string]: unknown;
}

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.TEST_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const ALLOW_LIVE_E2E = process.env.ALLOW_LIVE_E2E === "true";

if (!API_KEY) throw new Error("TEST_API_KEY is required");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
const apiHost = new URL(API_BASE_URL).hostname;
const databaseHost = new URL(DATABASE_URL).hostname;
const isLocalApi = apiHost === "localhost" || apiHost === "127.0.0.1";
const isLocalDatabase =
  databaseHost === "localhost" || databaseHost === "127.0.0.1";
if ((!isLocalApi || !isLocalDatabase) && !ALLOW_LIVE_E2E) {
  throw new Error(
    `Refusing to run mutating smoke tests against API ${apiHost} and DB ${databaseHost} without ALLOW_LIVE_E2E=true`,
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") ? true : undefined,
});

const runId = `e2e-${Date.now()}`;
const scope = `test-${runId}`;
const project = `project-${runId}`;
const wrongWorkspaceId = "00000000-0000-4000-8000-000000000001";
const headers = {
  "content-type": "application/json",
  "x-api-key": API_KEY,
};
const results: TestResult[] = [];
const created = {
  memories: [] as string[],
  companyMemories: [] as string[],
  documents: [] as string[],
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nestedId(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const nested = value[key];
  if (!isRecord(nested)) return undefined;
  return typeof nested.id === "string" ? nested.id : undefined;
}

function topLevelString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  return typeof value[key] === "string" ? value[key] : undefined;
}

function idFromSave(value: unknown) {
  return topLevelString(value, "id") ?? nestedId(value, "memory") ?? nestedId(value, "data");
}

function idFromDocument(value: unknown) {
  return (
    nestedId(value, "document") ??
    nestedId(value, "source") ??
    topLevelString(value, "id") ??
    topLevelString(value, "documentId") ??
    topLevelString(value, "sourceId")
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

async function request(
  method: string,
  path: string,
  body?: JsonRecord,
  useApiKey = true,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: useApiKey ? headers : { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await parseJson(response) };
}

function expectStatus(name: string, status: number, expected: ExpectedStatus) {
  const ok = Array.isArray(expected) ? expected.includes(status) : status === expected;
  results.push({ name, status, expected, ok });
  if (!ok) throw new Error(`${name} expected ${String(expected)} got ${status}`);
}

async function getKeyBinding() {
  const keyHash = createHash("sha256").update(API_KEY).digest("hex");
  const { rows } = await pool.query<{
    key_id: string;
    user_id: string;
    workspace_id: string;
    workspace_name: string | null;
    role: string | null;
  }>(
    `SELECT ak.id AS key_id, ak.user_id, ak.workspace_id, w.name AS workspace_name, wm.role
     FROM api_keys ak
     LEFT JOIN workspaces w ON w.id = ak.workspace_id
     LEFT JOIN workspace_members wm ON wm.workspace_id = ak.workspace_id AND wm.user_id = ak.user_id
     WHERE ak.key_hash = $1
     LIMIT 1`,
    [keyHash],
  );
  const binding = rows[0];
  if (!binding?.workspace_id) throw new Error("TEST_API_KEY is not bound to a workspace");
  if (!binding.role) throw new Error("TEST_API_KEY owner is not a member of its workspace");
  return binding;
}

async function findOwnedCurrentMemoryId(params: {
  userId: string;
  workspaceId: string;
  contentPrefix: string;
}) {
  const { rows } = await pool.query<{ id: string }>(
    `SELECT id
     FROM memories
     WHERE user_id = $1
       AND workspace_id = $2
       AND scope = $3
       AND content ILIKE $4
       AND memory_type = 'member'
       AND is_current = true
       AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [params.userId, params.workspaceId, scope, `${params.contentPrefix}%`],
  );
  return rows[0]?.id;
}

async function cleanup(workspaceId: string) {
  for (const id of [...created.companyMemories].reverse()) {
    await request("DELETE", `/api/context-vault/memories/${id}?workspaceId=${workspaceId}`).catch(() => null);
  }
  for (const id of [...created.documents].reverse()) {
    await request("DELETE", `/api/context-vault/documents/${id}?workspaceId=${workspaceId}`).catch(() => null);
  }
  for (const id of [...created.memories].reverse()) {
    await request("DELETE", `/api/memories/${id}?scope=${encodeURIComponent(scope)}`).catch(() => null);
  }
}

async function assertCleanup() {
  const memories = await pool.query<{
    active_current: string;
    soft_deleted: string;
    total_versions: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE deleted_at IS NULL AND is_current = true)::text AS active_current,
       COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::text AS soft_deleted,
       COUNT(*)::text AS total_versions
     FROM memories
     WHERE content ILIKE $1 OR scope = $2 OR project = $3`,
    [`%${runId}%`, scope, project],
  );
  const sources = await pool.query<{ remaining: string }>(
    `SELECT COUNT(*)::text AS remaining
     FROM memory_sources
     WHERE title ILIKE $1 OR scope = $2 OR project = $3`,
    [`%${runId}%`, scope, project],
  );
  if (memories.rows[0]?.active_current !== "0") {
    throw new Error(`cleanup failed: ${memories.rows[0]?.active_current} active test memories remain`);
  }
  if (sources.rows[0]?.remaining !== "0") {
    throw new Error(`cleanup failed: ${sources.rows[0]?.remaining} test memory_sources remain`);
  }
  return { memories: memories.rows[0], memorySources: sources.rows[0] };
}

async function main() {
  const binding = await getKeyBinding();
  const workspaceId = binding.workspace_id;

  try {
    let response = await fetch(`${API_BASE_URL}/health`);
    expectStatus("health", response.status, 200);

    response = await fetch(`${API_BASE_URL}/.well-known/oauth-authorization-server`);
    expectStatus("oauth metadata root", response.status, 200);

    response = await fetch(`${API_BASE_URL}/.well-known/oauth-authorization-server/api/auth`);
    expectStatus("oauth metadata api/auth", response.status, 200);

    let result = await request("GET", "/api/auth/get-session", undefined, false);
    expectStatus("auth get-session unauthenticated", result.status, 200);

    result = await request(
      "POST",
      "/api/auth/sign-in/email",
      { email: "nobody@example.invalid", password: randomUUID() },
      false,
    );
    expectStatus("auth invalid email signin rejected", result.status, [400, 401, 403]);

    result = await request("POST", "/api/memories", {
      content: `Temporary E2E memory alpha ${runId}`,
      category: "fact",
      scope,
      project,
    });
    expectStatus("memory save default workspace", result.status, [201, 202]);
    const memoryA = await findOwnedCurrentMemoryId({
      userId: binding.user_id,
      workspaceId,
      contentPrefix: `Temporary E2E memory alpha ${runId}`,
    });
    if (!memoryA) {
      throw new Error("memory save did not create an owned current memory for update/delete smoke tests");
    }
    created.memories.push(memoryA);

    result = await request("GET", `/api/memories/${memoryA}?scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}`);
    expectStatus("memory get", result.status, 200);

    result = await request("GET", `/api/memories?scope=${encodeURIComponent(scope)}&project=${encodeURIComponent(project)}&workspaceId=${workspaceId}&limit=10`);
    expectStatus("memory list", result.status, 200);

    result = await request("GET", `/api/memories/search?query=${encodeURIComponent(`alpha ${runId}`)}&scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}&limit=5`);
    expectStatus("memory search", result.status, 200);

    result = await request("GET", `/api/memories/profile?scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}`);
    expectStatus("memory profile", result.status, 200);

    result = await request("GET", `/api/memories/graph?scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}`);
    expectStatus("memory graph", result.status, 200);

    result = await request("POST", `/api/memories/${memoryA}/feedback?scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}`, {
      type: "helpful",
      context: `temporary feedback ${runId}`,
    });
    expectStatus("memory feedback", result.status, 200);

    result = await request("PATCH", `/api/memories/${memoryA}?scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}`, {
      content: `Temporary E2E memory alpha updated ${runId}`,
      category: "decision",
      project,
    });
    expectStatus("memory update", result.status, 200);

    result = await request("GET", `/api/memories/${memoryA}/history?scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}`);
    expectStatus("memory history", result.status, 200);

    result = await request("POST", "/api/memories", {
      content: `Temporary E2E memory beta ${runId}`,
      category: "context",
      scope,
      project,
      workspaceId,
    });
    expectStatus("memory save matching workspace", result.status, [201, 202]);
    const memoryB = await findOwnedCurrentMemoryId({
      userId: binding.user_id,
      workspaceId,
      contentPrefix: `Temporary E2E memory beta ${runId}`,
    });
    if (memoryB) created.memories.push(memoryB);

    if (memoryB) {
      result = await request("DELETE", "/api/memories/bulk", { ids: [memoryB], scope, workspaceId });
      expectStatus("memory bulk delete", result.status, 200);
      created.memories = created.memories.filter((id) => id !== memoryB);
    }

    result = await request("POST", `/api/memories/${memoryA}/forget?scope=${encodeURIComponent(scope)}&workspaceId=${workspaceId}`);
    expectStatus("memory forget", result.status, 200);
    created.memories = created.memories.filter((id) => id !== memoryA);

    result = await request("POST", "/api/memories", { content: `Wrong workspace ${runId}`, workspaceId: wrongWorkspaceId });
    expectStatus("memory override rejected", result.status, 403);

    result = await request("GET", `/api/memories/search?query=${encodeURIComponent(runId)}&workspaceId=${wrongWorkspaceId}`);
    expectStatus("memory search override rejected", result.status, 403);

    result = await request("GET", `/api/context-vault/hierarchy?workspaceId=${workspaceId}`);
    expectStatus("vault hierarchy", result.status, 200);

    result = await request("GET", `/api/context-vault/documents?workspaceId=${workspaceId}`);
    expectStatus("vault documents", result.status, 200);

    result = await request("GET", `/api/context-vault/memories?workspaceId=${workspaceId}&limit=5`);
    expectStatus("vault memories", result.status, 200);

    result = await request("POST", "/api/context-vault/memories", {
      workspaceId,
      content: `Temporary company fact ${runId}`,
      category: "fact",
      scope,
      project,
    });
    expectStatus("vault company fact save", result.status, 201);
    const companyMemoryId = idFromSave(result.json);
    if (!companyMemoryId) throw new Error("company fact did not return id");
    created.companyMemories.push(companyMemoryId);

    result = await request("GET", `/api/context-vault/search?workspaceId=${workspaceId}&query=${encodeURIComponent(`company fact ${runId}`)}&mode=memories&limit=5`);
    expectStatus("vault search", result.status, 200);

    result = await request("GET", `/api/context-vault/memories/${companyMemoryId}/evidence?workspaceId=${workspaceId}`);
    expectStatus("vault evidence", result.status, 200);

    result = await request("POST", `/api/context-vault/memories/${companyMemoryId}/feedback`, {
      workspaceId,
      type: "helpful",
      context: `temporary vault feedback ${runId}`,
    });
    expectStatus("vault feedback", result.status, 200);

    result = await request("POST", `/api/context-vault/memories/${companyMemoryId}/correction`, {
      workspaceId,
      type: "wrong",
      correctedContent: `Corrected temporary company fact ${runId}`,
      reason: "E2E temporary correction",
    });
    expectStatus("vault correction", result.status, 200);

    result = await request("DELETE", `/api/context-vault/memories/${companyMemoryId}?workspaceId=${workspaceId}`);
    expectStatus("vault memory delete", result.status, 200);
    created.companyMemories = created.companyMemories.filter((id) => id !== companyMemoryId);

    result = await request("POST", "/api/context-vault/documents", {
      workspaceId,
      title: `Temporary E2E document ${runId}`,
      content: `Temporary E2E document content ${runId}. This should be deleted after tests.`,
      sourceType: "text",
      scope,
      project,
    });
    expectStatus("vault document ingest", result.status, 202);
    const documentId = idFromDocument(result.json);
    if (!documentId) throw new Error("document ingest did not return id");
    created.documents.push(documentId);

    result = await request("GET", `/api/context-vault/documents/${documentId}/memories?workspaceId=${workspaceId}`);
    expectStatus("vault document memories", result.status, [200, 404]);

    result = await request("POST", `/api/context-vault/documents/${documentId}/cancel?workspaceId=${workspaceId}`);
    expectStatus("vault document cancel", result.status, [200, 400]);

    result = await request("DELETE", `/api/context-vault/documents/${documentId}?workspaceId=${workspaceId}`);
    expectStatus("vault document delete", result.status, 200);
    created.documents = created.documents.filter((id) => id !== documentId);

    const file = new File([`temporary upload ${runId}`], `temporary-${runId}.txt`, { type: "text/plain" });
    const form = new FormData();
    form.set("workspaceId", workspaceId);
    form.set("title", `Temporary upload ${runId}`);
    form.set("scope", scope);
    form.set("project", project);
    form.set("file", file);
    response = await fetch(`${API_BASE_URL}/api/context-vault/documents/upload`, {
      method: "POST",
      headers: { "x-api-key": API_KEY },
      body: form,
    });
    expectStatus("vault document upload", response.status, 202);
    const uploadJson = await parseJson(response);
    const uploadedDocumentId = idFromDocument(uploadJson);
    if (uploadedDocumentId) {
      created.documents.push(uploadedDocumentId);
      result = await request("DELETE", `/api/context-vault/documents/${uploadedDocumentId}?workspaceId=${workspaceId}`);
      expectStatus("vault uploaded document delete", result.status, 200);
      created.documents = created.documents.filter((id) => id !== uploadedDocumentId);
    }

    result = await request("GET", `/api/context-vault/search?workspaceId=${wrongWorkspaceId}&query=${encodeURIComponent(runId)}`);
    expectStatus("vault search override rejected", result.status, 403);

    result = await request("GET", `/api/context-vault/documents?workspaceId=${wrongWorkspaceId}`);
    expectStatus("vault documents override rejected", result.status, 403);

    result = await request("POST", "/api/context-vault/memories", { workspaceId: wrongWorkspaceId, content: `Wrong vault ${runId}` });
    expectStatus("vault memory override rejected", result.status, 403);

    const sessionOnlyChecks: Array<[string, string, string, JsonRecord | undefined]> = [
      ["workspace list rejects api key", "GET", "/api/workspaces", undefined],
      ["workspace create rejects api key", "POST", "/api/workspaces", { name: `Temporary ${runId}` }],
      ["workspace team rejects api key", "GET", `/api/workspaces/${workspaceId}/team`, undefined],
      ["workspace invite rejects api key", "POST", `/api/workspaces/${workspaceId}/invitations`, { email: `test-${runId}@example.com`, role: "viewer" }],
      ["workspace billing owner rejects api key", "PATCH", `/api/workspaces/${workspaceId}/billing-owner`, { userId: binding.user_id }],
      ["workspace accept invite rejects api key", "POST", "/api/workspaces/invitations/accept", { token: "x".repeat(32) }],
      ["user profile rejects api key", "GET", "/api/user/profile", undefined],
      ["user subscription rejects api key", "GET", `/api/user/subscription?workspaceId=${workspaceId}`, undefined],
      ["user dashboard stats rejects api key", "GET", `/api/user/dashboard-stats?workspaceId=${workspaceId}`, undefined],
      ["user memory hierarchy rejects api key", "GET", `/api/user/memory-hierarchy?workspaceId=${workspaceId}`, undefined],
      ["subscription current rejects api key", "GET", `/api/subscription/current?workspaceId=${workspaceId}`, undefined],
      ["subscription checkout rejects api key", "POST", "/api/subscription/checkout", { plan: "hobby", workspaceId }],
      ["subscription portal rejects api key", "POST", "/api/subscription/portal", { workspaceId }],
      ["subscription change-plan rejects api key", "POST", "/api/subscription/change-plan", { plan: "pro", workspaceId }],
      ["api keys list rejects api key", "GET", "/api/api-keys", undefined],
      ["api keys create rejects api key", "POST", "/api/api-keys", { name: `Temporary ${runId}`, workspaceId }],
      ["api keys delete rejects api key", "DELETE", `/api/api-keys/${randomUUID()}`, undefined],
      ["admin stats rejects api key", "GET", "/api/admin/stats", undefined],
      ["admin users rejects api key", "GET", "/api/admin/users", undefined],
    ];

    for (const [name, method, path, body] of sessionOnlyChecks) {
      result = await request(method, path, body);
      expectStatus(name, result.status, 401);
    }

    result = await request("POST", "/api/waitlist", { email: "not-an-email", source: "hero" }, false);
    expectStatus("waitlist invalid payload rejected", result.status, 400);

    const cleanup = await assertCleanup();
    console.log(JSON.stringify({
      ok: true,
      runId,
      apiBaseUrl: API_BASE_URL,
      keyBinding: {
        keyId: binding.key_id,
        userId: binding.user_id,
        workspaceId,
        workspaceName: binding.workspace_name,
        role: binding.role,
      },
      passed: results.length,
      results,
      cleanup,
    }, null, 2));
  } finally {
    await cleanup(workspaceId);
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    ok: false,
    runId,
    error: error instanceof Error ? error.message : String(error),
    passedBeforeFailure: results.filter((result) => result.ok).length,
    results,
  }, null, 2));
  process.exit(1);
});
