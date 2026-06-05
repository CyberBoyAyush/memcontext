import {
  db,
  subscriptions,
  PLAN_LIMITS,
  CONTEXT_VAULT_LIMITS,
  memorySources,
  workspaces,
} from "../db/index.js";
import type { PlanType, SubscriptionStatus } from "../db/schema.js";
import { and, eq, inArray, sql } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface CheckMemoryLimitOptions {
  incrementBy?: number;
  tx?: Transaction;
}

async function lockSubscriptionRow(
  userId: string,
  tx?: Transaction,
): Promise<void> {
  if (!tx) {
    return;
  }

  // Transaction-only lock: serialize per-user reservation checks inside
  // long-save transactions so concurrent requests cannot both over-allocate
  // against the same plan limit. This no-op UPDATE is a row-lock workaround.
  await tx
    .update(subscriptions)
    .set({ updatedAt: sql`${subscriptions.updatedAt}` })
    .where(eq(subscriptions.userId, userId));
}

export interface MemoryLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}

export type ContextLimitKind = "workspaces" | "documents";

export interface ContextLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}

export interface SubscriptionData {
  plan: PlanType;
  memoryCount: number;
  memoryLimit: number;
  contextDocumentsCount: number;
  contextDocumentsLimit: number;
  workspaceCount: number;
  workspaceLimit: number;
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
  await getOrCreateSubscription(userId, tx);
  await lockSubscriptionRow(userId, tx);
  const [sub] = await executor
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
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

export async function checkWorkspaceLimit(
  userId: string,
): Promise<ContextLimitCheck> {
  const sub = await getOrCreateSubscription(userId);
  const plan = sub.plan as PlanType;
  const limit = CONTEXT_VAULT_LIMITS[plan].workspaces;
  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(eq(workspaces.createdByUserId, userId));
  const current = usage?.count ?? 0;

  return {
    allowed: current < limit,
    current,
    limit,
    plan,
  };
}

export async function checkContextDocumentLimit(
  userId: string,
): Promise<ContextLimitCheck> {
  const sub = await getOrCreateSubscription(userId);
  const plan = sub.plan as PlanType;
  const limit = CONTEXT_VAULT_LIMITS[plan].documents;
  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memorySources)
    .where(
      and(
        eq(memorySources.userId, userId),
        sql`${memorySources.workspaceId} IS NOT NULL`,
      ),
    );
  const current = usage?.count ?? 0;

  return {
    allowed: current < limit,
    current,
    limit,
    plan,
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
  const plan = sub.plan as PlanType;
  const [workspaceUsage, documentUsage] = await Promise.all([
    checkWorkspaceLimit(userId),
    checkContextDocumentLimit(userId),
  ]);

  return {
    plan,
    memoryCount: sub.memoryCount,
    memoryLimit: sub.memoryLimit,
    contextDocumentsCount: documentUsage.current,
    contextDocumentsLimit: CONTEXT_VAULT_LIMITS[plan].documents,
    workspaceCount: workspaceUsage.current,
    workspaceLimit: CONTEXT_VAULT_LIMITS[plan].workspaces,
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
