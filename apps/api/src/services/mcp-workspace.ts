import { and, eq } from "drizzle-orm";
import { db, mcpWorkspaceSelections, workspaceMembers } from "../db/index.js";
import { getOrCreateDefaultWorkspace } from "./subscription.js";

export const MCP_SCOPE = "mcp:memories";
export const MCP_WORKSPACE_CLAIM = "workspace_id";

async function getSelectedMcpWorkspaceId(userId: string) {
  const [selection] = await db
    .select({ workspaceId: mcpWorkspaceSelections.workspaceId })
    .from(mcpWorkspaceSelections)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, mcpWorkspaceSelections.workspaceId),
        eq(workspaceMembers.userId, mcpWorkspaceSelections.userId),
      ),
    )
    .where(eq(mcpWorkspaceSelections.userId, userId))
    .limit(1);

  return selection?.workspaceId;
}

// Workspace an MCP OAuth grant is bound to at consent time.
export async function resolveMcpWorkspaceId(userId: string) {
  return (
    (await getSelectedMcpWorkspaceId(userId)) ??
    (await getOrCreateDefaultWorkspace(userId))
  );
}

export async function isWorkspaceMember(userId: string, workspaceId: string) {
  const [member] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(member);
}
