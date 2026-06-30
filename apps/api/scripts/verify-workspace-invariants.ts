import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") ? true : undefined,
});

interface CheckResult {
  name: string;
  value: number;
  expected: string;
  ok: boolean;
}

const checks: CheckResult[] = [];

async function scalar(sql: string) {
  const { rows } = await pool.query<{ count: string }>(sql);
  return Number(rows[0]?.count ?? 0);
}

async function expectZero(name: string, sql: string) {
  const value = await scalar(sql);
  checks.push({ name, value, expected: "0", ok: value === 0 });
}

async function expectAtLeast(name: string, sql: string, minimum: number) {
  const value = await scalar(sql);
  checks.push({ name, value, expected: `>= ${minimum}`, ok: value >= minimum });
}

async function main() {
  await expectAtLeast("workspaces exist", `SELECT COUNT(*)::text FROM workspaces`, 1);
  await expectAtLeast("vaults exist", `SELECT COUNT(*)::text FROM vaults`, 1);
  await expectAtLeast("subscriptions exist", `SELECT COUNT(*)::text FROM subscriptions`, 1);

  await expectZero("vaults missing workspace_id", `SELECT COUNT(*)::text FROM vaults WHERE workspace_id IS NULL`);
  await expectZero("subscriptions missing workspace_id", `SELECT COUNT(*)::text FROM subscriptions WHERE workspace_id IS NULL`);
  await expectZero("api keys missing workspace_id", `SELECT COUNT(*)::text FROM api_keys WHERE workspace_id IS NULL`);
  await expectZero("current memories missing workspace_id", `SELECT COUNT(*)::text FROM memories WHERE is_current = true AND deleted_at IS NULL AND workspace_id IS NULL`);
  await expectZero("legacy user memory_type remains", `SELECT COUNT(*)::text FROM memories WHERE memory_type = 'user'`);
  await expectZero("member memories attached to vault", `SELECT COUNT(*)::text FROM memories WHERE memory_type = 'member' AND vault_id IS NOT NULL`);
  await expectZero("document/company memories missing vault", `SELECT COUNT(*)::text FROM memories WHERE memory_type IN ('document', 'company') AND is_current = true AND deleted_at IS NULL AND vault_id IS NULL`);
  await expectZero("workspace creators missing owner membership", `SELECT COUNT(*)::text FROM workspaces w WHERE NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = w.created_by_user_id AND wm.role = 'owner')`);
  await expectZero("workspaces missing default vault", `SELECT COUNT(*)::text FROM workspaces w WHERE NOT EXISTS (SELECT 1 FROM vaults v WHERE v.workspace_id = w.id AND v.is_default = true)`);
  await expectZero("duplicate default vaults", `SELECT COUNT(*)::text FROM (SELECT workspace_id FROM vaults WHERE is_default = true GROUP BY workspace_id HAVING COUNT(*) > 1) dup`);
  await expectZero("duplicate workspace subscriptions", `SELECT COUNT(*)::text FROM (SELECT workspace_id FROM subscriptions GROUP BY workspace_id HAVING COUNT(*) > 1) dup`);
  await expectZero("duplicate workspace members", `SELECT COUNT(*)::text FROM (SELECT workspace_id, user_id FROM workspace_members GROUP BY workspace_id, user_id HAVING COUNT(*) > 1) dup`);
  await expectZero("api key owner not workspace member", `SELECT COUNT(*)::text FROM api_keys ak WHERE NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = ak.workspace_id AND wm.user_id = ak.user_id)`);
  await expectZero("subscription billing owner not workspace member", `SELECT COUNT(*)::text FROM subscriptions s JOIN workspaces w ON w.id = s.workspace_id WHERE NOT EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = w.id AND wm.user_id = s.user_id)`);
  await expectZero("memory workspace/vault mismatch", `SELECT COUNT(*)::text FROM memories m JOIN vaults v ON v.id = m.vault_id WHERE m.workspace_id <> v.workspace_id`);
  await expectZero("source workspace/vault mismatch", `SELECT COUNT(*)::text FROM memory_sources ms JOIN vaults v ON v.id = ms.vault_id WHERE ms.workspace_id <> v.workspace_id`);
  await expectZero("relation source workspace mismatch", `SELECT COUNT(*)::text FROM memory_relations mr JOIN memories m ON m.id = mr.source_id WHERE mr.workspace_id IS DISTINCT FROM m.workspace_id`);
  await expectZero("relation target workspace mismatch", `SELECT COUNT(*)::text FROM memory_relations mr JOIN memories m ON m.id = mr.target_id WHERE mr.workspace_id IS DISTINCT FROM m.workspace_id`);

  const failed = checks.filter((check) => !check.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, checks, failed }, null, 2));
  await pool.end();
  if (failed.length > 0) process.exit(1);
}

main().catch(async (error: unknown) => {
  await pool.end().catch(() => undefined);
  console.error(error);
  process.exit(1);
});
