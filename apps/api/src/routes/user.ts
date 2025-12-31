import { Hono } from "hono";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import { getSubscriptionData } from "../services/subscription.js";
import { db } from "../db/index.js";
import { user as userTable } from "../db/auth-schema.js";
import { memories } from "../db/schema.js";

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

// GET /dashboard-stats - Get dashboard statistics
app.get("/dashboard-stats", async (c) => {
  const { userId } = c.get("session");

  // Run all queries in parallel for performance
  const [categoryStats, projectStats, recentMemories] = await Promise.all([
    // Category breakdown
    db
      .select({
        category: memories.category,
        count: sql<number>`count(*)::int`,
      })
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.isCurrent, true),
          isNull(memories.deletedAt),
        ),
      )
      .groupBy(memories.category),

    // Project breakdown (all projects)
    db
      .select({
        project: memories.project,
        count: sql<number>`count(*)::int`,
      })
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.isCurrent, true),
          isNull(memories.deletedAt),
        ),
      )
      .groupBy(memories.project)
      .orderBy(desc(sql`count(*)`)),

    // Recent memories (last 5)
    db
      .select({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        project: memories.project,
        createdAt: memories.createdAt,
      })
      .from(memories)
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.isCurrent, true),
          isNull(memories.deletedAt),
        ),
      )
      .orderBy(desc(memories.createdAt))
      .limit(5),
  ]);

  // Transform category stats into an object
  const categories = {
    preference: 0,
    fact: 0,
    decision: 0,
    context: 0,
    uncategorized: 0,
  };

  for (const stat of categoryStats) {
    if (stat.category && stat.category in categories) {
      categories[stat.category as keyof typeof categories] = stat.count;
    } else {
      categories.uncategorized += stat.count;
    }
  }

  // Transform projects (filter null and rename)
  const projects = projectStats.map((p) => ({
    name: p.project ?? "Global",
    count: p.count,
  }));

  return c.json({
    categories,
    projects,
    recentMemories: recentMemories.map((m) => ({
      id: m.id,
      content:
        m.content.length > 100 ? m.content.slice(0, 100) + "..." : m.content,
      category: m.category,
      project: m.project ?? "Global",
      createdAt: m.createdAt,
    })),
  });
});

export default app;
