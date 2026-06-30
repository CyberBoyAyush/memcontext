import { db } from "../db/index.js";
import { user } from "../db/auth-schema.js";
import {
  subscriptions,
  apiKeys,
  memories,
  workspaces,
  workspaceMembers,
  PLAN_LIMITS,
  type PlanType,
} from "../db/schema.js";
import { eq, ilike, or, count, isNull, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { invalidateApiKey } from "./cache.js";
import { getOrCreateDefaultWorkspace } from "./subscription.js";

export interface ListUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
  adminId: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  createdAt: Date;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

export interface AdminUserDetails extends AdminUser {
  apiKeyCount: number;
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    plan: string;
    memoryCount: number;
    memoryLimit: number;
  }>;
}

export interface AdminStats {
  totalUsers: number;
  totalWorkspaces: number;
  totalMemories: number;
  usersByPlan: Record<string, number>;
  workspacesByPlan: Record<string, number>;
}

export interface ListUsersResult {
  users: AdminUser[];
  total: number;
}

export async function listUsers(
  params: ListUsersParams,
): Promise<ListUsersResult> {
  const { limit = 20, offset = 0, search, adminId } = params;

  const baseCondition = search
    ? or(ilike(user.email, `%${search}%`), ilike(user.name, `%${search}%`))
    : undefined;

  const [userRows, countResult] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(baseCondition)
      .orderBy(user.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(user).where(baseCondition),
  ]);

  const users: AdminUser[] = await Promise.all(
    userRows.map(async (row) => {
      const workspaceId = await getOrCreateDefaultWorkspace(row.id);
      const [subscription] = await db
        .select({
          plan: subscriptions.plan,
          memoryCount: subscriptions.memoryCount,
          memoryLimit: subscriptions.memoryLimit,
        })
        .from(subscriptions)
        .where(eq(subscriptions.workspaceId, workspaceId))
        .limit(1);

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified,
        image: row.image,
        role: row.role,
        createdAt: row.createdAt,
        plan: subscription?.plan || "free",
        memoryCount: subscription?.memoryCount || 0,
        memoryLimit: subscription?.memoryLimit || PLAN_LIMITS.free,
      };
    }),
  );

  logger.info(
    {
      adminId,
      action: "list_users",
      search: search || null,
      limit,
      offset,
      resultCount: users.length,
      totalCount: countResult[0]?.count || 0,
    },
    "admin viewed users list",
  );

  return {
    users,
    total: countResult[0]?.count || 0,
  };
}

export interface GetUserDetailsParams {
  userId: string;
  adminId: string;
}

export async function getUserDetails(
  params: GetUserDetailsParams,
): Promise<AdminUserDetails | null> {
  const { userId, adminId } = params;
  const workspaceId = await getOrCreateDefaultWorkspace(userId);
  const [userRow] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!userRow) {
    return null;
  }

  const [apiKeyResult] = await db
    .select({ count: count() })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));
  const workspaceRows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
      plan: subscriptions.plan,
      memoryCount: subscriptions.memoryCount,
      memoryLimit: subscriptions.memoryLimit,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .leftJoin(subscriptions, eq(subscriptions.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));
  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      memoryCount: subscriptions.memoryCount,
      memoryLimit: subscriptions.memoryLimit,
    })
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const userDetails = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    emailVerified: userRow.emailVerified,
    image: userRow.image,
    role: userRow.role,
    createdAt: userRow.createdAt,
    plan: subscription?.plan || "free",
    memoryCount: subscription?.memoryCount || 0,
    memoryLimit: subscription?.memoryLimit || PLAN_LIMITS.free,
    apiKeyCount: apiKeyResult?.count || 0,
    workspaces: workspaceRows.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: workspace.role,
      plan: workspace.plan || "free",
      memoryCount: workspace.memoryCount || 0,
      memoryLimit: workspace.memoryLimit || PLAN_LIMITS.free,
    })),
  };

  logger.info(
    {
      adminId,
      action: "view_user_details",
      targetUserId: userId,
      targetEmail: userRow.email,
    },
    "admin viewed user details",
  );

  return userDetails;
}

export interface UpdateUserPlanParams {
  userId: string;
  workspaceId: string;
  plan: PlanType;
  adminId: string;
}

export async function updateUserPlan(
  params: UpdateUserPlanParams,
): Promise<{ success: boolean; previousPlan: string }> {
  const { userId, workspaceId, plan, adminId } = params;

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new Error("Workspace not found for user");
  }

  // Get previous plan for logging (before upsert)
  const [existing] = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  const previousPlan = existing?.plan || "free";
  const newLimit = PLAN_LIMITS[plan];

  // Use upsert to prevent race conditions
  await db
    .insert(subscriptions)
    .values({
      userId,
      workspaceId,
      plan,
      memoryLimit: newLimit,
      memoryCount: 0,
    })
    .onConflictDoUpdate({
      target: subscriptions.workspaceId,
      set: {
        plan,
        memoryLimit: newLimit,
        updatedAt: sql`now()`,
      },
    });

  // Invalidate cached API keys so they get fresh plan data on next request
  const userApiKeys = await db
    .select({ keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  for (const { keyHash } of userApiKeys) {
    await invalidateApiKey(keyHash);
  }

  logger.info(
    {
      adminId,
      targetUserId: userId,
      workspaceId,
      previousPlan,
      newPlan: plan,
      newLimit,
      invalidatedKeys: userApiKeys.length,
    },
    "admin updated workspace plan",
  );

  return { success: true, previousPlan };
}

export async function getStats(adminId: string): Promise<AdminStats> {
  const [totalUsersResult, totalWorkspacesResult, totalMemoriesResult, planBreakdown] =
    await Promise.all([
      db.select({ count: count() }).from(user),
      db.select({ count: count() }).from(workspaces),
      db
        .select({ count: count() })
        .from(memories)
        .where(and(eq(memories.isCurrent, true), isNull(memories.deletedAt))),
      db
        .select({
          plan: subscriptions.plan,
          count: count(),
        })
        .from(subscriptions)
        .groupBy(subscriptions.plan),
    ]);

  const workspacesByPlan: Record<string, number> = {};
  for (const row of planBreakdown) {
    workspacesByPlan[row.plan] = row.count;
  }

  const totalWorkspacesWithSubs = Object.values(workspacesByPlan).reduce(
    (a, b) => a + b,
    0,
  );
  const totalWorkspaces = totalWorkspacesResult[0]?.count || 0;
  const workspacesWithoutSubs = totalWorkspaces - totalWorkspacesWithSubs;

  if (workspacesWithoutSubs > 0) {
    workspacesByPlan["free"] =
      (workspacesByPlan["free"] || 0) + workspacesWithoutSubs;
  }

  const totalUsers = totalUsersResult[0]?.count || 0;
  const stats = {
    totalUsers,
    totalWorkspaces,
    totalMemories: totalMemoriesResult[0]?.count || 0,
    usersByPlan: workspacesByPlan,
    workspacesByPlan,
  };

  logger.info(
    {
      adminId,
      action: "view_stats",
      totalUsers: stats.totalUsers,
      totalWorkspaces: stats.totalWorkspaces,
      totalMemories: stats.totalMemories,
    },
    "admin viewed system stats",
  );

  return stats;
}
