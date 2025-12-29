import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import { getSubscriptionData } from "../services/subscription.js";
import { db } from "../db/index.js";
import { user as userTable } from "../db/auth-schema.js";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

// All routes require session authentication
app.use("*", sessionAuthMiddleware);

// GET /profile - Get user profile
app.get("/profile", async (c) => {
  const { userId } = c.get("session");

  const user = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return c.json({ user });
});

// GET /subscription - Get subscription data
app.get("/subscription", async (c) => {
  const { userId } = c.get("session");
  const subscription = await getSubscriptionData(userId);
  return c.json(subscription);
});

export default app;
