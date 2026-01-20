import { db, subscriptions, PLAN_LIMITS } from "../db/index.js";
import type { PlanType, SubscriptionStatus } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface MemoryLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}

export interface SubscriptionData {
  plan: PlanType;
  memoryCount: number;
  memoryLimit: number;
  status: SubscriptionStatus;
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
}

export async function getOrCreateSubscription(
  userId: string,
  tx?: Transaction,
) {
  const executor = tx ?? db;

  // Use upsert to handle concurrent requests for new users
  // ON CONFLICT DO UPDATE with no-op just to return the existing row
  const [sub] = await executor
    .insert(subscriptions)
    .values({
      userId,
      plan: "free",
      memoryCount: 0,
      memoryLimit: PLAN_LIMITS.free,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { updatedAt: sql`${subscriptions.updatedAt}` }, // No-op, keeps existing value
    })
    .returning();

  return sub;
}

export async function checkMemoryLimit(
  userId: string,
  tx?: Transaction,
): Promise<MemoryLimitCheck> {
  const sub = await getOrCreateSubscription(userId, tx);

  return {
    allowed: sub.memoryCount < sub.memoryLimit,
    current: sub.memoryCount,
    limit: sub.memoryLimit,
    plan: sub.plan as PlanType,
  };
}

export async function incrementMemoryCount(
  userId: string,
  tx?: Transaction,
): Promise<void> {
  const executor = tx ?? db;
  await executor
    .update(subscriptions)
    .set({
      memoryCount: sql`${subscriptions.memoryCount} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.userId, userId));
}

export async function decrementMemoryCount(
  userId: string,
  tx?: Transaction,
): Promise<void> {
  const executor = tx ?? db;
  await executor
    .update(subscriptions)
    .set({
      memoryCount: sql`GREATEST(${subscriptions.memoryCount} - 1, 0)`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.userId, userId));
}

export async function updatePlan(
  userId: string,
  plan: PlanType,
): Promise<void> {
  const limit = PLAN_LIMITS[plan];

  await db
    .update(subscriptions)
    .set({
      plan,
      memoryLimit: limit,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.userId, userId));
}

export async function getSubscriptionData(
  userId: string,
): Promise<SubscriptionData> {
  const sub = await getOrCreateSubscription(userId);
  return {
    plan: sub.plan as PlanType,
    memoryCount: sub.memoryCount,
    memoryLimit: sub.memoryLimit,
    status: sub.status as SubscriptionStatus,
    dodoCustomerId: sub.dodoCustomerId,
    dodoSubscriptionId: sub.dodoSubscriptionId,
  };
}

/**
 * Check if user has an active paid subscription
 */
export async function hasActivePaidSubscription(
  userId: string,
): Promise<boolean> {
  const sub = await getOrCreateSubscription(userId);
  return sub.plan !== "free" && sub.status === "active";
}
