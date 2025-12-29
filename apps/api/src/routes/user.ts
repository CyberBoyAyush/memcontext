import { Hono } from "hono";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import { getSubscriptionData } from "../services/subscription.js";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

// All routes require session authentication
app.use("*", sessionAuthMiddleware);

// GET /profile - Get user profile
app.get("/profile", async (c) => {
  const { user } = c.get("session");
  return c.json({ user });
});

// GET /subscription - Get subscription data
app.get("/subscription", async (c) => {
  const { userId } = c.get("session");
  const subscription = await getSubscriptionData(userId);
  return c.json(subscription);
});

export default app;
