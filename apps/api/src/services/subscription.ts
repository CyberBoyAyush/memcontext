import { db, subscriptions, PLAN_LIMITS } from "../db/index.js";
import type { PlanType } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

export interface MemoryLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}

export async function getOrCreateSubscription(userId: string) {
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  if (existing) {
    return existing;
  }

  const [newSub] = await db
    .insert(subscriptions)
    .values({
      userId,
      plan: "free",
      memoryCount: 0,
      memoryLimit: PLAN_LIMITS.free,
    })
    .returning();

  return newSub;
}

export async function checkMemoryLimit(
  userId: string,
): Promise<MemoryLimitCheck> {
  const sub = await getOrCreateSubscription(userId);

  return {
    allowed: sub.memoryCount < sub.memoryLimit,
    current: sub.memoryCount,
    limit: sub.memoryLimit,
    plan: sub.plan as PlanType,
  };
}

export async function incrementMemoryCount(userId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      memoryCount: sql`${subscriptions.memoryCount} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.userId, userId));
}

export async function decrementMemoryCount(userId: string): Promise<void> {
  await db
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

export async function getSubscriptionData(userId: string) {
  const sub = await getOrCreateSubscription(userId);
  return {
    plan: sub.plan,
    memoryCount: sub.memoryCount,
    memoryLimit: sub.memoryLimit,
  };
}
