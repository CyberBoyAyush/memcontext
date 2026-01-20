import { db, subscriptions, apiKeys, PLAN_LIMITS } from "../db/index.js";
import { user as userTable } from "../db/auth-schema.js";
import type { PlanType, SubscriptionStatus } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { env } from "../env.js";
import { invalidateApiKey } from "./cache.js";

// Generic webhook payload type - accepts any Dodo webhook structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebhookPayload = any;

/**
 * Invalidates all cached API keys for a user
 * Called when plan changes so API requests get fresh plan data
 */
async function invalidateUserCache(userId: string): Promise<void> {
  const userKeys = await db
    .select({ keyHash: apiKeys.keyHash })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  for (const { keyHash } of userKeys) {
    await invalidateApiKey(keyHash);
  }

  if (userKeys.length > 0) {
    logger.debug(
      { userId, invalidatedCount: userKeys.length },
      "invalidated user API key caches after plan change",
    );
  }
}

/**
 * Maps Dodo product ID to our internal plan type
 */
export function mapProductToPlan(productId: string): PlanType {
  if (productId === env.DODO_PRODUCT_HOBBY) return "hobby";
  if (productId === env.DODO_PRODUCT_PRO) return "pro";
  return "free";
}

/**
 * Finds user ID from Dodo customer metadata, existing subscription, or email
 */
async function findUserIdFromCustomer(
  customerId: string,
  metadata?: Record<string, unknown> | null,
  email?: string,
): Promise<string | null> {
  // 1. First try metadata (if custom implementation sets it)
  if (metadata?.user_id && typeof metadata.user_id === "string") {
    return metadata.user_id;
  }

  // 2. Try existing dodoCustomerId (for renewals/cancellations)
  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.dodoCustomerId, customerId))
    .limit(1);

  if (sub) return sub.userId;

  // 3. Fallback to email lookup (for first-time purchases)
  if (email) {
    const [user] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);

    if (user) {
      logger.debug(
        { email, userId: user.id },
        "Found user by email for first-time purchase",
      );
      return user.id;
    }
  }

  return null;
}

/**
 * Handle subscription.active webhook
 * Called when: User completes payment and subscription is activated
 */
export async function handleSubscriptionActive(
  payload: WebhookPayload,
): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  const customer = payload.data?.customer;
  const productId = payload.data?.product_id;

  logger.debug(
    {
      subscriptionId,
      customerId: customer?.customer_id,
      customerEmail: customer?.email,
      productId,
      hasMetadata: !!customer?.metadata,
    },
    "Processing subscription.active webhook",
  );

  if (!subscriptionId || !customer || !productId) {
    logger.error(
      { payload: JSON.stringify(payload) },
      "Missing required fields in subscription.active",
    );
    return;
  }

  const userId = await findUserIdFromCustomer(
    customer.customer_id,
    customer.metadata,
    customer.email,
  );

  if (!userId) {
    logger.error(
      {
        customerId: customer.customer_id,
        customerEmail: customer.email,
        subscriptionId,
      },
      "Could not find user for subscription.active webhook",
    );
    return;
  }

  const plan = mapProductToPlan(productId);
  const memoryLimit = PLAN_LIMITS[plan];

  logger.debug(
    { userId, productId, plan, memoryLimit },
    "Mapped product to plan",
  );

  await db
    .update(subscriptions)
    .set({
      dodoCustomerId: customer.customer_id,
      dodoSubscriptionId: subscriptionId,
      plan,
      memoryLimit,
      status: "active" as SubscriptionStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  // Invalidate API key cache so requests get fresh plan data
  await invalidateUserCache(userId);

  logger.info(
    {
      userId,
      plan,
      memoryLimit,
      subscriptionId,
      customerId: customer.customer_id,
    },
    "Subscription activated successfully",
  );
}

/**
 * Handle subscription.cancelled webhook
 * Called when: User cancels subscription (still has access until period ends)
 */
export async function handleSubscriptionCancelled(
  payload: WebhookPayload,
): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;

  if (!subscriptionId) {
    logger.error(
      { payload: JSON.stringify(payload) },
      "Missing subscription_id in subscription.cancelled",
    );
    return;
  }

  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId))
    .limit(1);

  if (!sub) {
    logger.warn({ subscriptionId }, "Subscription not found for cancellation");
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: "cancelled" as SubscriptionStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));

  logger.info(
    { userId: sub.userId, subscriptionId },
    "Subscription cancelled (access until period ends)",
  );
}

/**
 * Handle subscription.expired webhook
 * Called when: Subscription period ends after cancellation
 */
export async function handleSubscriptionExpired(
  payload: WebhookPayload,
): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;

  if (!subscriptionId) {
    logger.error(
      { payload: JSON.stringify(payload) },
      "Missing subscription_id in subscription.expired",
    );
    return;
  }

  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId))
    .limit(1);

  if (!sub) {
    logger.warn({ subscriptionId }, "Subscription not found for expiration");
    return;
  }

  // Downgrade to free plan
  await db
    .update(subscriptions)
    .set({
      plan: "free",
      memoryLimit: PLAN_LIMITS.free,
      status: "active" as SubscriptionStatus,
      dodoSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, sub.userId));

  // Invalidate API key cache so requests get fresh plan data
  await invalidateUserCache(sub.userId);

  logger.info(
    { userId: sub.userId, subscriptionId },
    "Subscription expired, downgraded to free",
  );
}

/**
 * Handle subscription.on_hold webhook
 * Called when: Payment fails after all retry attempts
 */
export async function handleSubscriptionOnHold(
  payload: WebhookPayload,
): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;

  if (!subscriptionId) {
    logger.error(
      { payload: JSON.stringify(payload) },
      "Missing subscription_id in subscription.on_hold",
    );
    return;
  }

  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId))
    .limit(1);

  if (!sub) {
    logger.warn({ subscriptionId }, "Subscription not found for on_hold");
    return;
  }

  await db
    .update(subscriptions)
    .set({
      status: "on_hold" as SubscriptionStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));

  logger.info(
    { userId: sub.userId, subscriptionId },
    "Subscription on hold (payment failed)",
  );
}

/**
 * Handle subscription.renewed webhook
 * Called when: Recurring payment succeeds
 */
export async function handleSubscriptionRenewed(
  payload: WebhookPayload,
): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;

  if (!subscriptionId) {
    logger.error(
      { payload: JSON.stringify(payload) },
      "Missing subscription_id in subscription.renewed",
    );
    return;
  }

  const [sub] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId))
    .limit(1);

  if (!sub) {
    logger.warn({ subscriptionId }, "Subscription not found for renewal");
    return;
  }

  // Ensure status is active after successful renewal
  await db
    .update(subscriptions)
    .set({
      status: "active" as SubscriptionStatus,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));

  logger.info({ userId: sub.userId, subscriptionId }, "Subscription renewed");
}

/**
 * Handle subscription.plan_changed webhook
 * Called when: User upgrades or downgrades plan
 */
export async function handleSubscriptionPlanChanged(
  payload: WebhookPayload,
): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  const productId = payload.data?.product_id;

  if (!subscriptionId || !productId) {
    logger.error(
      { payload: JSON.stringify(payload) },
      "Missing required fields in subscription.plan_changed",
    );
    return;
  }

  const [sub] = await db
    .select({ userId: subscriptions.userId, plan: subscriptions.plan })
    .from(subscriptions)
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId))
    .limit(1);

  if (!sub) {
    logger.warn({ subscriptionId }, "Subscription not found for plan change");
    return;
  }

  const newPlan = mapProductToPlan(productId);
  const newMemoryLimit = PLAN_LIMITS[newPlan];

  await db
    .update(subscriptions)
    .set({
      plan: newPlan,
      memoryLimit: newMemoryLimit,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.dodoSubscriptionId, subscriptionId));

  // Invalidate API key cache so requests get fresh plan data
  await invalidateUserCache(sub.userId);

  logger.info(
    { userId: sub.userId, subscriptionId, oldPlan: sub.plan, newPlan },
    "Subscription plan changed",
  );
}

/**
 * Handle subscription.failed webhook
 * Called when: Subscription creation failed during mandate creation (payment authorization failed)
 */
export async function handleSubscriptionFailed(
  payload: WebhookPayload,
): Promise<void> {
  const subscriptionId = payload.data?.subscription_id;
  const customer = payload.data?.customer;

  logger.debug(
    {
      subscriptionId,
      customerId: customer?.customer_id,
      customerEmail: customer?.email,
    },
    "Processing subscription.failed webhook",
  );

  if (!customer) {
    logger.error(
      { payload: JSON.stringify(payload) },
      "Missing customer in subscription.failed",
    );
    return;
  }

  // Find user by customer ID or email (user may not have dodoCustomerId yet since sub failed)
  const userId = await findUserIdFromCustomer(
    customer.customer_id,
    customer.metadata,
    customer.email,
  );

  if (!userId) {
    logger.error(
      {
        customerId: customer.customer_id,
        customerEmail: customer.email,
        subscriptionId,
      },
      "Could not find user for subscription.failed webhook",
    );
    return;
  }

  // Mark subscription as failed - user can retry from dashboard
  await db
    .update(subscriptions)
    .set({
      status: "failed" as SubscriptionStatus,
      // Store customer ID so we can track this user in Dodo
      dodoCustomerId: customer.customer_id,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  logger.info(
    { userId, subscriptionId, customerId: customer.customer_id },
    "Subscription creation failed (mandate creation failed)",
  );
}
