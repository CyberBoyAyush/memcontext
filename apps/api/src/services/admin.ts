import { db } from "../db/index.js";
import { user } from "../db/auth-schema.js";
import {
  subscriptions,
  apiKeys,
  memories,
  PLAN_LIMITS,
  type PlanType,
} from "../db/schema.js";
import { eq, ilike, or, count, isNull, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { invalidateApiKey } from "./cache.js";

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
}

export interface AdminStats {
  totalUsers: number;
  totalMemories: number;
  usersByPlan: Record<string, number>;
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

  const [usersWithSubs, countResult] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt,
        plan: subscriptions.plan,
        memoryCount: subscriptions.memoryCount,
        memoryLimit: subscriptions.memoryLimit,
      })
      .from(user)
      .leftJoin(subscriptions, eq(user.id, subscriptions.userId))
      .where(baseCondition)
      .orderBy(user.createdAt)
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(user).where(baseCondition),
  ]);

  const users: AdminUser[] = usersWithSubs.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: row.image,
    role: row.role,
    createdAt: row.createdAt,
    plan: row.plan || "free",
    memoryCount: row.memoryCount || 0,
    memoryLimit: row.memoryLimit || PLAN_LIMITS.free,
  }));

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
  const [userRow] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      createdAt: user.createdAt,
      plan: subscriptions.plan,
      memoryCount: subscriptions.memoryCount,
      memoryLimit: subscriptions.memoryLimit,
    })
    .from(user)
    .leftJoin(subscriptions, eq(user.id, subscriptions.userId))
    .where(eq(user.id, userId))
    .limit(1);

  if (!userRow) {
    return null;
  }

  const [apiKeyResult] = await db
    .select({ count: count() })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  const userDetails = {
    id: userRow.id,
    name: userRow.name,
    email: userRow.email,
    emailVerified: userRow.emailVerified,
    image: userRow.image,
    role: userRow.role,
    createdAt: userRow.createdAt,
    plan: userRow.plan || "free",
    memoryCount: userRow.memoryCount || 0,
    memoryLimit: userRow.memoryLimit || PLAN_LIMITS.free,
    apiKeyCount: apiKeyResult?.count || 0,
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
  plan: PlanType;
  adminId: string;
}

export async function updateUserPlan(
  params: UpdateUserPlanParams,
): Promise<{ success: boolean; previousPlan: string }> {
  const { userId, plan, adminId } = params;

  // Get previous plan for logging (before upsert)
  const [existing] = await db
    .select({ plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const previousPlan = existing?.plan || "free";
  const newLimit = PLAN_LIMITS[plan];

  // Use upsert to prevent race conditions
  await db
    .insert(subscriptions)
    .values({
      userId,
      plan,
      memoryLimit: newLimit,
      memoryCount: 0,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
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
      previousPlan,
      newPlan: plan,
      newLimit,
      invalidatedKeys: userApiKeys.length,
    },
    "admin updated user plan",
  );

  return { success: true, previousPlan };
}

export async function getStats(adminId: string): Promise<AdminStats> {
  const [totalUsersResult, totalMemoriesResult, planBreakdown] =
    await Promise.all([
      db.select({ count: count() }).from(user),
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

  const usersByPlan: Record<string, number> = {};
  for (const row of planBreakdown) {
    usersByPlan[row.plan] = row.count;
  }

  const totalUsersWithSubs = Object.values(usersByPlan).reduce(
    (a, b) => a + b,
    0,
  );
  const totalUsers = totalUsersResult[0]?.count || 0;
  const usersWithoutSubs = totalUsers - totalUsersWithSubs;

  if (usersWithoutSubs > 0) {
    usersByPlan["free"] = (usersByPlan["free"] || 0) + usersWithoutSubs;
  }

  const stats = {
    totalUsers,
    totalMemories: totalMemoriesResult[0]?.count || 0,
    usersByPlan,
  };

  logger.info(
    {
      adminId,
      action: "view_stats",
      totalUsers: stats.totalUsers,
      totalMemories: stats.totalMemories,
    },
    "admin viewed system stats",
  );

  return stats;
}
