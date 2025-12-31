import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  adminAuthMiddleware,
  type AdminContext,
} from "../middleware/admin-auth.js";
import {
  listUsers,
  getUserDetails,
  updateUserPlan,
  getStats,
} from "../services/admin.js";
import { PLAN_LIMITS, type PlanType } from "../db/schema.js";

const app = new Hono<{
  Variables: {
    admin: AdminContext;
    requestId?: string;
  };
}>();

app.use("*", adminAuthMiddleware);

// Sanitize search input: trim, limit length, remove dangerous characters
function sanitizeSearch(input: string | undefined): string | undefined {
  if (!input) return undefined;
  return input
    .trim()
    .slice(0, 100) // Max 100 chars for search
    .replace(/[%_\\]/g, ""); // Remove SQL wildcard chars that could affect ILIKE
}

// Schema for userId param - non-empty string, reasonable length
const userIdParamSchema = z.object({
  userId: z
    .string()
    .min(1, "User ID is required")
    .max(128, "User ID too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid user ID format"),
});

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).max(100000).optional().default(0),
  search: z
    .string()
    .max(100, "Search query too long")
    .optional()
    .transform(sanitizeSearch),
});

app.get("/users", zValidator("query", listUsersQuerySchema), async (c) => {
  const { limit, offset, search } = c.req.valid("query");
  const admin = c.get("admin");

  const result = await listUsers({
    limit,
    offset,
    search,
    adminId: admin.userId,
  });

  return c.json({
    users: result.users,
    total: result.total,
    limit,
    offset,
  });
});

app.get("/users/:userId", zValidator("param", userIdParamSchema), async (c) => {
  const { userId } = c.req.valid("param");
  const admin = c.get("admin");

  const userDetails = await getUserDetails({ userId, adminId: admin.userId });

  if (!userDetails) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(userDetails);
});

const updatePlanSchema = z.object({
  plan: z.enum(["free", "hobby", "pro"]),
});

app.patch(
  "/users/:userId/plan",
  zValidator("param", userIdParamSchema),
  zValidator("json", updatePlanSchema),
  async (c) => {
    const { userId } = c.req.valid("param");
    const { plan } = c.req.valid("json");
    const admin = c.get("admin");

    const userDetails = await getUserDetails({ userId, adminId: admin.userId });
    if (!userDetails) {
      return c.json({ error: "User not found" }, 404);
    }

    const result = await updateUserPlan({
      userId,
      plan: plan as PlanType,
      adminId: admin.userId,
    });

    return c.json({
      success: result.success,
      previousPlan: result.previousPlan,
      newPlan: plan,
      newLimit: PLAN_LIMITS[plan as PlanType],
    });
  },
);

app.get("/stats", async (c) => {
  const admin = c.get("admin");
  const stats = await getStats(admin.userId);

  return c.json(stats);
});

export default app;
