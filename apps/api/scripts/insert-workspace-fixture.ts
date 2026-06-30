import "dotenv/config";
import { createHash } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const ALLOW_WORKSPACE_FIXTURE = process.env.ALLOW_WORKSPACE_FIXTURE === "true";
const DEV_API_KEY = process.env.WORKSPACE_FIXTURE_API_KEY;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}
if (!ALLOW_WORKSPACE_FIXTURE) {
  throw new Error(
    "Refusing to insert fixture data without ALLOW_WORKSPACE_FIXTURE=true",
  );
}
if (!DEV_API_KEY) {
  throw new Error("WORKSPACE_FIXTURE_API_KEY is required");
}

const databaseHost = new URL(DATABASE_URL).hostname;
const isLocalDatabase =
  databaseHost === "localhost" || databaseHost === "127.0.0.1";
if (!isLocalDatabase && process.env.ALLOW_REMOTE_WORKSPACE_FIXTURE !== "true") {
  throw new Error(
    `Refusing to insert fixture data into remote DB ${databaseHost} without ALLOW_REMOTE_WORKSPACE_FIXTURE=true`,
  );
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") ? true : undefined,
});

const embedding = `[${Array.from({ length: 1536 }, () => "0").join(",")}]`;

const users = [
  { id: "usr_ayush_fixture", name: "Ayush", email: "ayush@example.invalid" },
  { id: "usr_edwin_fixture", name: "Edwin", email: "edwin@example.invalid" },
  { id: "usr_maya_fixture", name: "Maya", email: "maya@example.invalid" },
];
const devApiKey = DEV_API_KEY;
const devApiKeyHash = createHash("sha256").update(devApiKey).digest("hex");

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const user of users) {
      await client.query(
        `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
         VALUES ($1, $2, $3, true, 'user', NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, updated_at = NOW()`,
        [user.id, user.name, user.email],
      );
    }

    await client.query(
      `INSERT INTO workspaces (id, name, slug, created_by_user_id, billing_owner_user_id, created_at, updated_at)
       VALUES
        ('11111111-1111-4111-8111-111111111111', 'Aaysh Labs', 'aaysh-labs', $1, $1, NOW(), NOW()),
        ('22222222-2222-4222-8222-222222222222', 'Northstar Product', 'northstar-product', $2, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [users[0].id, users[1].id],
    );

    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES
        ('11111111-1111-4111-8111-111111111111', $1, 'owner'),
        ('11111111-1111-4111-8111-111111111111', $2, 'admin'),
        ('11111111-1111-4111-8111-111111111111', $3, 'member'),
        ('22222222-2222-4222-8222-222222222222', $2, 'owner'),
        ('22222222-2222-4222-8222-222222222222', $1, 'member')
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [users[0].id, users[1].id, users[2].id],
    );

    await client.query(
      `INSERT INTO vaults (id, workspace_id, name, slug, created_by_user_id, is_default, created_at, updated_at)
       VALUES
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Default Vault', 'default-vault', $1, true, NOW(), NOW()),
        ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'Customer Research', 'customer-research', $1, false, NOW(), NOW()),
        ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222', 'Default Vault', 'northstar-default-vault', $2, true, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
      [users[0].id, users[1].id],
    );

    await client.query(
      `INSERT INTO subscriptions (user_id, workspace_id, plan, memory_count, memory_limit, status, created_at, updated_at)
       VALUES
        ($1, '11111111-1111-4111-8111-111111111111', 'hobby', 3, 2000, 'active', NOW(), NOW()),
        ($2, '22222222-2222-4222-8222-222222222222', 'free', 1, 300, 'active', NOW(), NOW())
       ON CONFLICT (workspace_id) DO UPDATE SET plan = EXCLUDED.plan, memory_count = EXCLUDED.memory_count, memory_limit = EXCLUDED.memory_limit, updated_at = NOW()`,
      [users[0].id, users[1].id],
    );

    await client.query(
      `INSERT INTO api_keys (user_id, workspace_id, key_prefix, key_hash, name, created_at)
       VALUES ($1, '11111111-1111-4111-8111-111111111111', $2, $3, 'Dev Workspace Fixture Key', NOW())
       ON CONFLICT (key_hash) DO UPDATE SET workspace_id = EXCLUDED.workspace_id, name = EXCLUDED.name`,
      [users[0].id, devApiKey.slice(0, 11), devApiKeyHash],
    );

    const memoryRows = [
      ["10000000-0000-4000-8000-000000000001", "11111111-1111-4111-8111-111111111111", null, users[0].id, "member", "Ayush prefers concise implementation notes and direct status updates.", "preference", "memcontext"],
      ["10000000-0000-4000-8000-000000000002", "11111111-1111-4111-8111-111111111111", null, users[1].id, "member", "Edwin manages billing and workspace rollout decisions for Aaysh Labs.", "fact", "operations"],
      ["10000000-0000-4000-8000-000000000003", "11111111-1111-4111-8111-111111111111", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", users[0].id, "company", "Aaysh Labs support policy: customer onboarding questions should be answered within one business day.", "fact", "support"],
      ["10000000-0000-4000-8000-000000000004", "11111111-1111-4111-8111-111111111111", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", users[2].id, "document", "Research notes show teams want workspace-level memory pools and clear audit controls.", "context", "research"],
      ["10000000-0000-4000-8000-000000000005", "22222222-2222-4222-8222-222222222222", null, users[1].id, "member", "Northstar Product uses Default Vault for product briefs and launch notes.", "context", "northstar"],
    ];

    for (const row of memoryRows) {
      await client.query(
        `INSERT INTO memories (id, workspace_id, vault_id, user_id, memory_type, content, embedding, category, project, source, is_current, version, valid_from, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9, 'api', true, 1, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, workspace_id = EXCLUDED.workspace_id, vault_id = EXCLUDED.vault_id`,
        [row[0], row[1], row[2], row[3], row[4], row[5], embedding, row[6], row[7]],
      );
    }

    await client.query("COMMIT");
    console.log("Inserted workspace/vault fixture data.");
    console.log(`Dev API key: ${devApiKey}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
