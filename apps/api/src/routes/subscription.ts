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
import {
  getOrCreateDefaultWorkspace,
  getSubscriptionData,
} from "../services/subscription.js";
import { requireWorkspaceMember } from "../services/workspace.js";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

// All routes require session authentication
app.use("*", sessionAuthMiddleware);

const changePlanSchema = z.object({
  plan: z.enum(["hobby", "pro", "ultimate"]),
  workspaceId: z.string().uuid().optional(),
});

const checkoutSchema = z.object({
  plan: z.enum(["hobby", "pro", "ultimate"]),
  workspaceId: z.string().uuid(),
});

const portalSchema = z.object({
  workspaceId: z.string().uuid(),
});

const currentQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});

function getProductIdForPlan(plan: Exclude<PlanType, "free">) {
  if (plan === "hobby") return env.DODO_PRODUCT_HOBBY;
  if (plan === "pro") return env.DODO_PRODUCT_PRO;
  return env.DODO_PRODUCT_ULTIMATE;
}

// POST /checkout - Create a workspace-scoped checkout session
app.post("/checkout", async (c) => {
  const { userId, user } = c.get("session");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request. Plan and workspaceId are required" },
      400,
    );
  }

  const { plan, workspaceId } = parsed.data;
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (membership.role !== "owner") {
    return c.json(
      { error: "Only workspace owners can change billing", code: "FORBIDDEN" },
      403,
    );
  }

  const productId = getProductIdForPlan(plan);
  if (!productId) {
    return c.json(
      { error: "Ultimate plan is not configured yet.", code: "PLAN_NOT_CONFIGURED" },
      400,
    );
  }

  const session = await dodoClient.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: user.email,
      name: user.name || undefined,
    },
    metadata: {
      user_id: userId,
      workspace_id: workspaceId,
      workspaceId,
    },
    return_url: `${env.DASHBOARD_URL}/subscription?success=true&workspaceId=${workspaceId}`,
  });

  if (!session.checkout_url) {
    return c.json(
      { error: "Failed to create checkout session", code: "CHECKOUT_FAILED" },
      502,
    );
  }

  return c.json({ url: session.checkout_url, sessionId: session.session_id });
});

// POST /portal - Create a workspace-scoped billing portal session
app.post("/portal", async (c) => {
  const { userId } = c.get("session");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const parsed = portalSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request. workspaceId is required" }, 400);
  }

  const { workspaceId } = parsed.data;
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (membership.role !== "owner") {
    return c.json(
      { error: "Only workspace owners can manage billing", code: "FORBIDDEN" },
      403,
    );
  }

  const [subscription] = await db
    .select({ dodoCustomerId: subscriptions.dodoCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  if (!subscription?.dodoCustomerId) {
    return c.json(
      { error: "No billing customer found for this workspace", code: "NO_CUSTOMER" },
      404,
    );
  }

  const portalSession = await dodoClient.customers.customerPortal.create(
    subscription.dodoCustomerId,
  );

  return c.json({ url: portalSession.link });
});

// POST /change-plan - Change subscription plan (upgrade/downgrade)
app.post("/change-plan", async (c) => {
  const { userId } = c.get("session");

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body", code: "INVALID_JSON" }, 400);
  }

  const parsed = changePlanSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Invalid request. Plan must be 'hobby', 'pro', or 'ultimate'" },
      400,
    );
  }

  const { plan: newPlan } = parsed.data;
  const workspaceId =
    parsed.data.workspaceId ?? (await getOrCreateDefaultWorkspace(userId));
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (membership.role !== "owner") {
    return c.json(
      { error: "Only workspace owners can change billing", code: "FORBIDDEN" },
      403,
    );
  }

  // Get user's current subscription
  const [subscription] = await db
    .select({
      plan: subscriptions.plan,
      status: subscriptions.status,
      dodoSubscriptionId: subscriptions.dodoSubscriptionId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.workspaceId, workspaceId))
    .limit(1);

  if (!subscription) {
    logger.warn({ userId, workspaceId }, "No subscription found for workspace");
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
  const productId = getProductIdForPlan(newPlan);
  if (!productId) {
    return c.json(
      {
        error: "Ultimate plan is not configured yet.",
        code: "PLAN_NOT_CONFIGURED",
      },
      400,
    );
  }

  logger.info(
    {
      userId,
      workspaceId,
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
        workspaceId,
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
        workspaceId,
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
  const parsed = currentQuerySchema.safeParse({
    workspaceId: c.req.query("workspaceId"),
  });
  if (!parsed.success) {
    return c.json({ error: "Invalid workspaceId", code: "INVALID_WORKSPACE_ID" }, 400);
  }
  const workspaceId =
    parsed.data.workspaceId ?? (await getOrCreateDefaultWorkspace(userId));
  await requireWorkspaceMember(userId, workspaceId);
  return c.json(await getSubscriptionData(userId, workspaceId));
});

export default app;
