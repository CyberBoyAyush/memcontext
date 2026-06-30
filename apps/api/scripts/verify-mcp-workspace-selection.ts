import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface CheckResult {
  name: string;
  ok: boolean;
  details: string;
}

const root = resolve(process.cwd(), "../..");

async function includes(filePath: string, text: string) {
  const content = await readFile(resolve(root, filePath), "utf8");
  return content.includes(text);
}

async function main() {
  const checks: CheckResult[] = [];

  checks.push({
    name: "OAuth consent page loads workspaces",
    ok:
      (await includes("apps/dashboard/src/app/oauth/consent/page.tsx", "/api/workspaces")) &&
      (await includes("apps/dashboard/src/app/oauth/consent/page.tsx", "workspaces.map")),
    details: "Consent UI should fetch and render the session user's workspaces before approval.",
  });

  checks.push({
    name: "OAuth consent page saves selected workspace",
    ok:
      (await includes("apps/dashboard/src/app/oauth/consent/page.tsx", "/api/user/mcp-workspace")) &&
      (await includes("apps/dashboard/src/app/oauth/consent/page.tsx", "workspaceId")),
    details: "Consent approval should persist selected workspaceId before completing OAuth consent.",
  });

  const eitherAuth = await readFile(resolve(root, "apps/api/src/middleware/either-auth.ts"), "utf8");
  checks.push({
    name: "OAuth bearer auth uses selected MCP workspace",
    ok:
      eitherAuth.includes("mcpWorkspaceSelections") &&
      eitherAuth.includes("getSelectedMcpWorkspaceId"),
    details: "Bearer-token auth should resolve the user's selected MCP workspace before falling back to default.",
  });

  checks.push({
    name: "MCP HTTP server supports OAuth bearer auth",
    ok: await includes("apps/mcp/src/http.ts", "Authorization"),
    details: "Remote MCP must continue accepting OAuth bearer tokens.",
  });

  const failed = checks.filter((check) => !check.ok);
  console.log(JSON.stringify({ ok: failed.length === 0, checks, failed }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
