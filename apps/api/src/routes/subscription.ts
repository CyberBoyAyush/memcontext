import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import { db, subscriptions } from "../db/index.js";
import { dodoClient } from "../lib/auth.js";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import type { PlanType } from "../db/schema.js";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

// All routes require session authentication
app.use("*", sessionAuthMiddleware);

const changePlanSchema = z.object({
  plan: z.enum(["hobby", "pro"]),
});

// POST /change-plan - Change subscription plan (upgrade/downgrade)
app.post("/change-plan", async (c) => {
  const { userId } = c.get("session");

  const body = await c.req.json();
  const parsed = changePlanSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request. Plan must be 'hobby' or 'pro'" },
      400,
    );
  }

  const { plan: newPlan } = parsed.data;

  // Get user's current subscription
  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      dodoSubscriptionId: subscriptions.dodoSubscriptionId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription) {
    logger.warn({ userId }, "No subscription found for user");
    return c.json({ error: "No subscription found" }, 404);
  }

  // Check if subscription is active (not cancelled/on_hold)
  if (subscription.status !== "active") {
    logger.warn(
      { userId, status: subscription.status },
      "Cannot change plan - subscription is not active",
    );
    return c.json(
      {
        error:
          "Your subscription is not active. Please subscribe again using the checkout.",
        code: "SUBSCRIPTION_NOT_ACTIVE",
      },
      400,
    );
  }

  // Check if user has an active Dodo subscription
  if (!subscription.dodoSubscriptionId) {
    logger.warn(
      { userId, currentPlan: subscription.plan },
      "User has no active Dodo subscription, must use checkout flow",
    );
    return c.json(
      {
        error:
          "No active subscription. Please use the upgrade button to subscribe.",
        code: "NO_ACTIVE_SUBSCRIPTION",
      },
      400,
    );
  }

  // Check if already on this plan
  if (subscription.plan === newPlan) {
    return c.json(
      { error: `Already on ${newPlan} plan`, code: "SAME_PLAN" },
      400,
    );
  }

  // Map plan to Dodo product ID
  const productId =
    newPlan === "hobby" ? env.DODO_PRODUCT_HOBBY : env.DODO_PRODUCT_PRO;

  logger.info(
    {
      userId,
      currentPlan: subscription.plan,
      newPlan,
      subscriptionId: subscription.dodoSubscriptionId,
      productId,
    },
    "Initiating plan change",
  );

  try {
    // Call Dodo's Change Plan API
    await dodoClient.subscriptions.changePlan(subscription.dodoSubscriptionId, {
      product_id: productId,
      quantity: 1,
      proration_billing_mode: "prorated_immediately",
    });

    logger.info(
      {
        userId,
        subscriptionId: subscription.dodoSubscriptionId,
        newPlan,
      },
      "Plan change initiated successfully",
    );

    // Return success - webhook will update the DB
    return c.json({
      success: true,
      message: `Plan change to ${newPlan} initiated. Your subscription will be updated shortly.`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      {
        userId,
        subscriptionId: subscription.dodoSubscriptionId,
        newPlan,
        error: errorMessage,
      },
      "Failed to change plan via Dodo API",
    );

    // Handle specific Dodo API errors
    if (errorMessage.includes("previous payment is not successful")) {
      return c.json(
        {
          error:
            "Please wait - a payment is still processing. Try again in a moment.",
          code: "PAYMENT_IN_PROGRESS",
        },
        409,
      );
    }

    if (errorMessage.includes("Cannot change plan to a one-time")) {
      return c.json(
        {
          error:
            "This plan is not available for upgrades. Please contact support.",
          code: "INVALID_PRODUCT_TYPE",
        },
        400,
      );
    }

    return c.json(
      {
        error: "Failed to change plan. Please try again or contact support.",
        code: "PLAN_CHANGE_FAILED",
      },
      500,
    );
  }
});

// GET /current - Get current subscription (alternative to /api/user/subscription)
app.get("/current", async (c) => {
  const { userId } = c.get("session");

  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      memoryCount: subscriptions.memoryCount,
      memoryLimit: subscriptions.memoryLimit,
      status: subscriptions.status,
      dodoCustomerId: subscriptions.dodoCustomerId,
      dodoSubscriptionId: subscriptions.dodoSubscriptionId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription) {
    return c.json({
      plan: "free" as PlanType,
      memoryCount: 0,
      memoryLimit: 300,
      status: "active",
      dodoCustomerId: null,
      dodoSubscriptionId: null,
    });
  }

  return c.json(subscription);
});

export default app;
