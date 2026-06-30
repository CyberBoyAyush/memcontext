import {
  db,
  subscriptions,
  PLAN_LIMITS,
  CONTEXT_VAULT_LIMITS,
  memorySources,
  workspaces,
  workspaceMembers,
  vaults,
} from "../db/index.js";
import { user as userTable } from "../db/auth-schema.js";
import type { PlanType, SubscriptionStatus } from "../db/schema.js";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface CheckMemoryLimitOptions {
  incrementBy?: number;
  tx?: Transaction;
  workspaceId?: string;
}

interface CheckContextDocumentLimitOptions {
  workspaceId?: string;
}

async function lockSubscriptionRow(
  workspaceId: string,
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
    .where(eq(subscriptions.workspaceId, workspaceId));
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
  workspaceId: string;
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

async function getPrimaryWorkspaceId(userId: string, tx?: Transaction) {
  const executor = tx ?? db;
  const [owned] = await executor
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.createdByUserId, userId))
    .orderBy(asc(workspaces.createdAt), asc(workspaces.id))
    .limit(1);

  if (owned) return owned.id;

  const [membership] = await executor
    .select({ id: workspaces.id })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(asc(workspaces.createdAt), asc(workspaces.id))
    .limit(1);

  return membership?.id ?? null;
}

export async function getOrCreateDefaultWorkspace(
  userId: string,
  tx?: Transaction,
): Promise<string> {
  const existing = await getPrimaryWorkspaceId(userId, tx);
  if (existing) return existing;

  const executor = tx ?? db;
  const [currentUser] = await executor
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  const displayName = currentUser?.name?.trim() || "My";
  const name = `${displayName}'s Workspace`;
  const slug = `${slugifyWorkspaceName(displayName)}-workspace-${userId.slice(0, 8)}`;

  const [workspace] = await executor
    .insert(workspaces)
    .values({
      name,
      slug,
      createdByUserId: userId,
      billingOwnerUserId: userId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaces.slug,
      set: { updatedAt: sql`${workspaces.updatedAt}` },
    })
    .returning({ id: workspaces.id });

  const workspaceId = workspace?.id ?? (await getPrimaryWorkspaceId(userId, tx));
  if (!workspaceId) {
    throw new Error("Failed to create default workspace");
  }

  await executor
    .insert(workspaceMembers)
    .values({ workspaceId, userId, role: "owner" })
    .onConflictDoNothing();

  await executor
    .insert(vaults)
    .values({
      workspaceId,
      name: "Default Vault",
      slug: "default-vault",
      createdByUserId: userId,
      isDefault: true,
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  return workspaceId;
}

export async function getDefaultVaultId(workspaceId: string): Promise<string> {
  const [vault] = await db
    .select({ id: vaults.id })
    .from(vaults)
    .where(and(eq(vaults.workspaceId, workspaceId), eq(vaults.isDefault, true)))
    .limit(1);

  if (vault) return vault.id;

  const [workspace] = await db
    .select({ createdByUserId: workspaces.createdByUserId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new Error("Workspace not found");

  const [created] = await db
    .insert(vaults)
    .values({
      workspaceId,
      name: "Default Vault",
      slug: "default-vault",
      createdByUserId: workspace.createdByUserId,
      isDefault: true,
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: vaults.id });

  if (created) return created.id;

  const [fallback] = await db
    .select({ id: vaults.id })
    .from(vaults)
    .where(eq(vaults.workspaceId, workspaceId))
    .orderBy(asc(vaults.createdAt), asc(vaults.id))
    .limit(1);
  if (!fallback) throw new Error("Default vault not found");
  return fallback.id;
}

export async function resolveVaultForWorkspace(
  workspaceId: string,
  vaultId?: string,
): Promise<string> {
  if (!vaultId) return getDefaultVaultId(workspaceId);

  const [vault] = await db
    .select({ id: vaults.id })
    .from(vaults)
    .where(and(eq(vaults.id, vaultId), eq(vaults.workspaceId, workspaceId)))
    .limit(1);

  if (!vault) throw new Error("Vault not found");
  return vault.id;
}

function vaultSlug(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "vault";
}

export async function listVaultsForWorkspace(workspaceId: string) {
  await getDefaultVaultId(workspaceId);
  return db
    .select({
      id: vaults.id,
      name: vaults.name,
      slug: vaults.slug,
      isDefault: vaults.isDefault,
      createdAt: vaults.createdAt,
    })
    .from(vaults)
    .where(eq(vaults.workspaceId, workspaceId))
    .orderBy(desc(vaults.isDefault), asc(vaults.createdAt), asc(vaults.id));
}

export async function createVaultForWorkspace(
  workspaceId: string,
  userId: string,
  name: string,
) {
  await getDefaultVaultId(workspaceId);
  const baseSlug = vaultSlug(name);

  return db.transaction(async (tx) => {
    const sub = await getOrCreateSubscription(userId, workspaceId, tx);
    await lockSubscriptionRow(workspaceId, tx);
    const plan = sub.plan as PlanType;
    const limit = CONTEXT_VAULT_LIMITS[plan].workspaces;
    const [usage] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(vaults)
      .where(eq(vaults.workspaceId, workspaceId));

    if ((usage?.count ?? 0) >= limit) {
      throw new Error("Vault limit reached");
    }

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const [created] = await tx
        .insert(vaults)
        .values({
          workspaceId,
          name,
          slug,
          createdByUserId: userId,
          isDefault: false,
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({
          id: vaults.id,
          name: vaults.name,
          slug: vaults.slug,
          isDefault: vaults.isDefault,
          createdAt: vaults.createdAt,
        });
      if (created) return created;
    }
    throw new Error("Could not create vault");
  });
}

export async function getOrCreateSubscription(
  userId: string,
  workspaceId?: string,
  tx?: Transaction,
) {
  const executor = tx ?? db;
  const resolvedWorkspaceId = workspaceId ?? (await getOrCreateDefaultWorkspace(userId, tx));

  // Use upsert to handle concurrent requests for new users
  // ON CONFLICT DO UPDATE with no-op just to return the existing row
  const [sub] = await executor
    .insert(subscriptions)
    .values({
      userId,
      workspaceId: resolvedWorkspaceId,
      plan: "free",
      memoryCount: 0,
      memoryLimit: PLAN_LIMITS.free,
    })
    .onConflictDoUpdate({
      target: subscriptions.workspaceId,
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
  const workspaceId = options.workspaceId ?? (await getOrCreateDefaultWorkspace(userId, tx));
  await getOrCreateSubscription(userId, workspaceId, tx);
  await lockSubscriptionRow(workspaceId, tx);
  const [sub] = await executor
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);
  const [reserved] = await executor
    .select({
      total: sql<number>`coalesce(sum(${memorySources.reservedSlots}), 0)::int`,
    })
    .from(memorySources)
    .where(
      and(
        eq(memorySources.workspaceId, workspaceId),
        isNull(memorySources.vaultId),
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
  const workspaceId = await getOrCreateDefaultWorkspace(userId);
  const sub = await getOrCreateSubscription(userId, workspaceId);
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

export async function checkVaultLimit(
  userId: string,
  workspaceId: string,
): Promise<ContextLimitCheck> {
  const sub = await getOrCreateSubscription(userId, workspaceId);
  const plan = sub.plan as PlanType;
  const limit = CONTEXT_VAULT_LIMITS[plan].workspaces;
  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vaults)
    .where(eq(vaults.workspaceId, workspaceId));
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
  options: CheckContextDocumentLimitOptions = {},
): Promise<ContextLimitCheck> {
  const workspaceId = options.workspaceId ?? (await getOrCreateDefaultWorkspace(userId));
  const sub = await getOrCreateSubscription(userId, workspaceId);
  const plan = sub.plan as PlanType;
  const limit = CONTEXT_VAULT_LIMITS[plan].documents;
  const [usage] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(memorySources)
    .where(
      and(
        eq(memorySources.workspaceId, workspaceId),
        isNotNull(memorySources.vaultId),
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
  workspaceId?: string,
): Promise<void> {
  const executor = tx ?? db;
  const resolvedWorkspaceId = workspaceId ?? (await getOrCreateDefaultWorkspace(userId, tx));
  await executor
    .update(subscriptions)
    .set({
      memoryCount: sql`${subscriptions.memoryCount} + 1`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.workspaceId, resolvedWorkspaceId));
}

export async function decrementMemoryCount(
  userId: string,
  tx?: Transaction,
  workspaceId?: string,
): Promise<void> {
  const executor = tx ?? db;
  const resolvedWorkspaceId = workspaceId ?? (await getOrCreateDefaultWorkspace(userId, tx));
  await executor
    .update(subscriptions)
    .set({
      memoryCount: sql`GREATEST(${subscriptions.memoryCount} - 1, 0)`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(subscriptions.workspaceId, resolvedWorkspaceId));
}

export async function updatePlan(
  workspaceId: string,
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
    .where(eq(subscriptions.workspaceId, workspaceId));
}

export async function getSubscriptionData(
  userId: string,
  workspaceId?: string,
): Promise<SubscriptionData> {
  const resolvedWorkspaceId = workspaceId ?? (await getOrCreateDefaultWorkspace(userId));
  const sub = await getOrCreateSubscription(userId, resolvedWorkspaceId);
  const plan = sub.plan as PlanType;
  const [workspaceUsage, documentUsage] = await Promise.all([
    checkWorkspaceLimit(userId),
    checkContextDocumentLimit(userId, { workspaceId: resolvedWorkspaceId }),
  ]);

  return {
    workspaceId: resolvedWorkspaceId,
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
  const workspaceId = await getOrCreateDefaultWorkspace(userId);
  const sub = await getOrCreateSubscription(userId, workspaceId);
  return (
    sub.plan !== "free" &&
    (sub.status === "active" || sub.status === "cancelled")
  );
}
