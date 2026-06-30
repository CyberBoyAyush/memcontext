import { Hono } from "hono";
import { eq, and, isNull, sql, desc, asc } from "drizzle-orm";
import { z } from "zod";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import {
  getOrCreateDefaultWorkspace,
  getSubscriptionData,
} from "../services/subscription.js";
import { db } from "../db/index.js";
import { user as userTable } from "../db/auth-schema.js";
import { mcpWorkspaceSelections, memories } from "../db/schema.js";
import { requireWorkspaceMember } from "../services/workspace.js";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

const NO_PROJECT_FILTER_VALUE = "__memcontext_no_project__";
const workspaceQuerySchema = z.object({
  workspaceId: z.string().uuid().optional(),
});
const mcpWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
});

async function resolveSessionWorkspace(userId: string, workspaceId?: string) {
  const resolvedWorkspaceId = workspaceId ?? (await getOrCreateDefaultWorkspace(userId));
  await requireWorkspaceMember(userId, resolvedWorkspaceId);
  return resolvedWorkspaceId;
}

async function resolveVisibleUserId(userId: string, workspaceId: string) {
  const membership = await requireWorkspaceMember(userId, workspaceId);
  return membership.role === "owner" || membership.role === "admin"
    ? undefined
    : userId;
}

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
      role: userTable.role,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  return c.json({ user });
});

// GET /mcp-workspace - Get the workspace Claude/MCP OAuth should use
app.get("/mcp-workspace", async (c) => {
  const { userId } = c.get("session");
  const defaultWorkspaceId = await getOrCreateDefaultWorkspace(userId);
  const [selection] = await db
    .select({ workspaceId: mcpWorkspaceSelections.workspaceId })
    .from(mcpWorkspaceSelections)
    .where(eq(mcpWorkspaceSelections.userId, userId))
    .limit(1);

  const workspaceId = selection?.workspaceId ?? defaultWorkspaceId;
  await requireWorkspaceMember(userId, workspaceId);
  return c.json({ workspaceId });
});

// POST /mcp-workspace - Select the workspace Claude/MCP OAuth should use
app.post("/mcp-workspace", async (c) => {
  const { userId } = c.get("session");
  const body = await c.req.json().catch(() => null);
  const parsed = mcpWorkspaceSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid workspaceId" }, 400);

  await requireWorkspaceMember(userId, parsed.data.workspaceId);
  const [selection] = await db
    .insert(mcpWorkspaceSelections)
    .values({
      userId,
      workspaceId: parsed.data.workspaceId,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: mcpWorkspaceSelections.userId,
      set: {
        workspaceId: parsed.data.workspaceId,
        updatedAt: new Date(),
      },
    })
    .returning({ workspaceId: mcpWorkspaceSelections.workspaceId });

  return c.json(selection);
});

// GET /subscription - Get subscription data
app.get("/subscription", async (c) => {
  const { userId } = c.get("session");
  const parsed = workspaceQuerySchema.safeParse({
    workspaceId: c.req.query("workspaceId"),
  });
  if (!parsed.success) return c.json({ error: "Invalid workspaceId" }, 400);
  const workspaceId = await resolveSessionWorkspace(userId, parsed.data.workspaceId);
  const subscription = await getSubscriptionData(userId, workspaceId);
  return c.json(subscription);
});

// GET /dashboard-stats - Get dashboard statistics
app.get("/dashboard-stats", async (c) => {
  const { userId } = c.get("session");
  const parsed = workspaceQuerySchema.safeParse({
    workspaceId: c.req.query("workspaceId"),
  });
  if (!parsed.success) return c.json({ error: "Invalid workspaceId" }, 400);
  const workspaceId = await resolveSessionWorkspace(userId, parsed.data.workspaceId);
  const visibleUserId = await resolveVisibleUserId(userId, workspaceId);
  const baseConditions = [
    eq(memories.workspaceId, workspaceId),
    isNull(memories.vaultId),
    eq(memories.memoryType, "member"),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    ...(visibleUserId ? [eq(memories.userId, visibleUserId)] : []),
  ];

  // Run all queries in parallel for performance
  const [categoryStats, projectStats, recentMemories] = await Promise.all([
    // Category breakdown
    db
      .select({
        category: memories.category,
        count: sql<number>`count(*)::int`,
      })
      .from(memories)
      .where(and(...baseConditions))
      .groupBy(memories.category),

    // Project breakdown (all projects)
    db
      .select({
        project: memories.project,
        count: sql<number>`count(*)::int`,
      })
      .from(memories)
      .where(and(...baseConditions))
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
      .where(and(...baseConditions))
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

// GET /memory-hierarchy - Get global scopes and projects inside each scope
app.get("/memory-hierarchy", async (c) => {
  const { userId } = c.get("session");
  const parsed = workspaceQuerySchema.safeParse({
    workspaceId: c.req.query("workspaceId"),
  });
  if (!parsed.success) return c.json({ error: "Invalid workspaceId" }, 400);
  const workspaceId = await resolveSessionWorkspace(userId, parsed.data.workspaceId);
  const visibleUserId = await resolveVisibleUserId(userId, workspaceId);

  const rows = await db
    .select({
      scope: memories.scope,
      project: memories.project,
      count: sql<number>`count(*)::int`,
    })
    .from(memories)
    .where(
      and(
        eq(memories.workspaceId, workspaceId),
        isNull(memories.vaultId),
        eq(memories.memoryType, "member"),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
        ...(visibleUserId ? [eq(memories.userId, visibleUserId)] : []),
      ),
    )
    .groupBy(memories.scope, memories.project)
    .orderBy(asc(memories.scope), asc(memories.project));

  const global = {
    count: 0,
    projects: [] as Array<{ name: string; value: string; count: number }>,
  };
  const scopes = new Map<
    string,
    {
      name: string;
      count: number;
      projects: Array<{ name: string; value: string; count: number }>;
    }
  >();

  for (const row of rows) {
    const project = {
      name: row.project ?? "No project",
      value: row.project ?? NO_PROJECT_FILTER_VALUE,
      count: row.count,
    };

    if (row.scope === null) {
      global.count += row.count;
      global.projects.push(project);
      continue;
    }

    const scope = scopes.get(row.scope) ?? {
      name: row.scope,
      count: 0,
      projects: [],
    };
    scope.count += row.count;
    scope.projects.push(project);
    scopes.set(row.scope, scope);
  }

  return c.json({
    global,
    scopes: Array.from(scopes.values()).sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  });
});

export default app;
