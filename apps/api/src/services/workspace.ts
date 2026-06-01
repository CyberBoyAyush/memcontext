import { and, eq } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import {
  db,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
} from "../db/index.js";
import { user as userTable } from "../db/auth-schema.js";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

function slugifyWorkspaceName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "workspace";
}

export async function listWorkspaces(userId: string) {
  const memberships = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt);

  return { workspaces: memberships };
}

export async function createWorkspace(userId: string, name: string) {
  const baseSlug = slugifyWorkspaceName(name);
  const suffix = randomBytes(3).toString("hex");

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: name.trim(),
        slug: `${baseSlug}-${suffix}`,
        createdByUserId: userId,
        updatedAt: new Date(),
      })
      .returning();

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    });

    return { ...workspace, role: "owner" };
  });
}

export async function getWorkspaceMembership(
  userId: string,
  workspaceId: string,
) {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function requireWorkspaceMember(
  userId: string,
  workspaceId: string,
) {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) {
    throw new Error("Workspace not found");
  }
  return membership;
}

export async function inviteWorkspaceMember(params: {
  userId: string;
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
}) {
  const membership = await requireWorkspaceMember(
    params.userId,
    params.workspaceId,
  );
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only workspace owners and admins can invite members");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [invitation] = await db
    .insert(workspaceInvitations)
    .values({
      workspaceId: params.workspaceId,
      email: params.email.toLowerCase().trim(),
      role: params.role,
      tokenHash,
      invitedByUserId: params.userId,
      expiresAt,
    })
    .returning({
      id: workspaceInvitations.id,
      workspaceId: workspaceInvitations.workspaceId,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
      createdAt: workspaceInvitations.createdAt,
    });

  return { invitation, token };
}

export async function acceptWorkspaceInvitation(params: {
  userId: string;
  token: string;
}) {
  const tokenHash = createHash("sha256").update(params.token).digest("hex");
  const [currentUser] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, params.userId))
    .limit(1);

  if (!currentUser) {
    throw new Error("User not found");
  }

  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.tokenHash, tokenHash))
    .limit(1);

  if (
    !invitation ||
    invitation.revokedAt ||
    invitation.acceptedAt ||
    invitation.expiresAt < new Date() ||
    invitation.email.toLowerCase() !== currentUser.email.toLowerCase()
  ) {
    throw new Error("Invitation not found");
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: invitation.workspaceId,
        userId: params.userId,
        role: invitation.role,
      })
      .onConflictDoNothing();

    await tx
      .update(workspaceInvitations)
      .set({
        acceptedByUserId: params.userId,
        acceptedAt: new Date(),
      })
      .where(eq(workspaceInvitations.id, invitation.id));
  });

  return { success: true, workspaceId: invitation.workspaceId };
}
