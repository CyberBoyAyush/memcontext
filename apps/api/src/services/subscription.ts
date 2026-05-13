import { db, subscriptions, PLAN_LIMITS, memorySources } from "../db/index.js";
import type { PlanType, SubscriptionStatus } from "../db/schema.js";
import { and, eq, inArray, sql } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface CheckMemoryLimitOptions {
  incrementBy?: number;
  tx?: Transaction;
}

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
  options: CheckMemoryLimitOptions = {},
): Promise<MemoryLimitCheck> {
  const { incrementBy = 1, tx } = options;
  const executor = tx ?? db;
  const sub = await getOrCreateSubscription(userId, tx);
  const [reserved] = await executor
    .select({
      total: sql<number>`coalesce(sum(${memorySources.reservedSlots}), 0)::int`,
    })
    .from(memorySources)
    .where(
      and(
        eq(memorySources.userId, userId),
        inArray(memorySources.status, ["pending", "processing"]),
      ),
    );
  const activeReserved = reserved?.total ?? 0;
  const current = sub.memoryCount + activeReserved;

  return {
    allowed: current + incrementBy <= sub.memoryLimit,
    current,
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
  return (
    sub.plan !== "free" &&
    (sub.status === "active" || sub.status === "cancelled")
  );
}
