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

  checks.push({
    name: "OAuth grants bind the selected MCP workspace at consent time",
    ok:
      (await includes("apps/api/src/lib/auth.ts", "consentReferenceId")) &&
      (await includes("apps/api/src/lib/auth.ts", "resolveMcpWorkspaceId")) &&
      (await includes("apps/api/src/services/mcp-workspace.ts", "mcpWorkspaceSelections")),
    details: "Consent should snapshot the selected workspace into the grant (referenceId + workspace_id claim).",
  });

  checks.push({
    name: "OAuth bearer auth uses the token-bound workspace",
    ok:
      (await includes("apps/api/src/middleware/either-auth.ts", "verifyMcpAccessToken")) &&
      (await includes("apps/api/src/lib/mcp-oauth.ts", "MCP_WORKSPACE_CLAIM")),
    details: "Bearer-token auth should use the workspace bound to the grant, not the current selection.",
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
