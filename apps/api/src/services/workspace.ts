import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import {
  db,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
} from "../db/index.js";
import { user as userTable } from "../db/auth-schema.js";
import { env } from "../env.js";
import { sendAuthEmail } from "../lib/email.js";
import { checkWorkspaceLimit } from "./subscription.js";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type InvitableWorkspaceRole = Exclude<WorkspaceRole, "owner">;

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
  const limitCheck = await checkWorkspaceLimit(userId);
  if (!limitCheck.allowed) {
    throw new Error(
      `Workspace limit exceeded. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}. Upgrade your plan to create more workspaces.`,
    );
  }

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
  role: InvitableWorkspaceRole;
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
  const email = params.email.toLowerCase().trim();

  const [workspace] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, params.workspaceId))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const [existingMember] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .innerJoin(userTable, eq(workspaceMembers.userId, userTable.id))
    .where(
      and(
        eq(workspaceMembers.workspaceId, params.workspaceId),
        sql`lower(${userTable.email}) = ${email}`,
      ),
    )
    .limit(1);

  if (existingMember) {
    throw new Error("User is already a workspace member");
  }

  const invitation = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`${params.workspaceId}:${email}`}))`,
    );

    const [existingInvitation] = await tx
      .select({ id: workspaceInvitations.id })
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.workspaceId, params.workspaceId),
          eq(workspaceInvitations.email, email),
          isNull(workspaceInvitations.acceptedAt),
          isNull(workspaceInvitations.revokedAt),
          gt(workspaceInvitations.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (existingInvitation) {
      throw new Error("Invitation already pending");
    }

    const [created] = await tx
      .insert(workspaceInvitations)
      .values({
        workspaceId: params.workspaceId,
        email,
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

    return created;
  });

  if (!invitation) {
    throw new Error("Failed to create invitation");
  }

  const inviteUrl = new URL("/workspace-invites/accept", env.DASHBOARD_URL);
  inviteUrl.searchParams.set("token", token);

  try {
    await sendAuthEmail({
      to: email,
      subject: `You're invited to ${workspace.name} on MemContext`,
      text: `You have been invited to join ${workspace.name} on MemContext. Accept the invite here: ${inviteUrl.toString()}`,
      html: workspaceInviteEmailHtml({
        workspaceName: workspace.name,
        role: params.role,
        url: inviteUrl.toString(),
      }),
    });
  } catch (error) {
    await db
      .update(workspaceInvitations)
      .set({ revokedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitation.id));
    throw error;
  }

  return { invitation };
}

function workspaceInviteEmailHtml({
  workspaceName,
  role,
  url,
}: {
  workspaceName: string;
  role: InvitableWorkspaceRole;
  url: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7fb;font-family:Inter,Arial,sans-serif;color:#171717;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;">Join ${escapeHtml(workspaceName)} on MemContext</h1>
        <p style="margin:0 0 20px;color:#525252;font-size:15px;line-height:1.6;">
          You have been invited as a <strong>${role}</strong>. Accept this invite to access the workspace Context Vault.
        </p>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;padding:11px 16px;font-weight:600;font-size:14px;">Accept invite</a>
        <p style="margin:20px 0 0;color:#737373;font-size:12px;line-height:1.5;">
          This invite expires in 7 days. If you were not expecting this email, you can ignore it.
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export async function listWorkspaceTeam(params: {
  userId: string;
  workspaceId: string;
}) {
  const membership = await requireWorkspaceMember(
    params.userId,
    params.workspaceId,
  );

  const members = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(workspaceMembers)
    .innerJoin(userTable, eq(workspaceMembers.userId, userTable.id))
    .where(eq(workspaceMembers.workspaceId, params.workspaceId))
    .orderBy(asc(workspaceMembers.createdAt));

  const invitations = await db
    .select({
      id: workspaceInvitations.id,
      workspaceId: workspaceInvitations.workspaceId,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
      createdAt: workspaceInvitations.createdAt,
    })
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.workspaceId, params.workspaceId),
        isNull(workspaceInvitations.acceptedAt),
        isNull(workspaceInvitations.revokedAt),
        gt(workspaceInvitations.expiresAt, new Date()),
      ),
    )
    .orderBy(asc(workspaceInvitations.createdAt));

  return {
    currentUserRole: membership.role,
    members,
    invitations,
  };
}

async function requireWorkspaceManager(userId: string, workspaceId: string) {
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new Error("Only workspace owners and admins can manage members");
  }
  return membership;
}

function canManageRole(managerRole: string, targetRole: string) {
  if (targetRole === "owner") return false;
  if (managerRole === "owner") return true;
  return targetRole !== "admin";
}

export async function updateWorkspaceMemberRole(params: {
  userId: string;
  workspaceId: string;
  memberId: string;
  role: InvitableWorkspaceRole;
}) {
  const manager = await requireWorkspaceManager(
    params.userId,
    params.workspaceId,
  );
  const [target] = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, params.memberId),
        eq(workspaceMembers.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!target) {
    throw new Error("Member not found");
  }
  if (target.userId === params.userId) {
    throw new Error("You cannot change your own workspace role");
  }
  if (!canManageRole(manager.role, target.role)) {
    throw new Error("You cannot manage this workspace member");
  }

  const [member] = await db
    .update(workspaceMembers)
    .set({ role: params.role })
    .where(eq(workspaceMembers.id, params.memberId))
    .returning({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
    });

  return { member };
}

export async function removeWorkspaceMember(params: {
  userId: string;
  workspaceId: string;
  memberId: string;
}) {
  const manager = await requireWorkspaceManager(
    params.userId,
    params.workspaceId,
  );
  const [target] = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, params.memberId),
        eq(workspaceMembers.workspaceId, params.workspaceId),
      ),
    )
    .limit(1);

  if (!target) {
    throw new Error("Member not found");
  }
  if (target.userId === params.userId) {
    throw new Error("You cannot remove yourself from a workspace");
  }
  if (!canManageRole(manager.role, target.role)) {
    throw new Error("You cannot manage this workspace member");
  }

  await db
    .delete(workspaceMembers)
    .where(eq(workspaceMembers.id, params.memberId));

  return { success: true };
}

export async function revokeWorkspaceInvitation(params: {
  userId: string;
  workspaceId: string;
  invitationId: string;
}) {
  await requireWorkspaceManager(params.userId, params.workspaceId);

  const [invitation] = await db
    .update(workspaceInvitations)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(workspaceInvitations.id, params.invitationId),
        eq(workspaceInvitations.workspaceId, params.workspaceId),
        isNull(workspaceInvitations.acceptedAt),
        isNull(workspaceInvitations.revokedAt),
      ),
    )
    .returning({ id: workspaceInvitations.id });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  return { success: true };
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

  const accepted = await db.transaction(async (tx) => {
    const [invitation] = await tx
      .update(workspaceInvitations)
      .set({
        acceptedByUserId: params.userId,
        acceptedAt: new Date(),
      })
      .where(
        and(
          eq(workspaceInvitations.tokenHash, tokenHash),
          eq(workspaceInvitations.email, currentUser.email.toLowerCase()),
          isNull(workspaceInvitations.acceptedAt),
          isNull(workspaceInvitations.revokedAt),
          gt(workspaceInvitations.expiresAt, new Date()),
        ),
      )
      .returning({
        id: workspaceInvitations.id,
        workspaceId: workspaceInvitations.workspaceId,
        role: workspaceInvitations.role,
      });

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: invitation.workspaceId,
        userId: params.userId,
        role: invitation.role,
      })
      .onConflictDoNothing();

    return invitation;
  });

  return { success: true, workspaceId: accepted.workspaceId };
}
