import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { and, eq, inArray, isNull, max } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  oauthClient,
  oauthConsent,
  oauthRefreshToken,
  user as userTable,
} from "../db/auth-schema.js";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import { getWorkspaceMembership } from "../services/workspace.js";

const app = new Hono<{ Variables: { session: SessionContext } }>();

app.use("*", sessionAuthMiddleware);

const workspaceQuerySchema = z.object({ workspaceId: z.string().uuid() });
const connectionIdParamSchema = z.object({ id: z.string().min(1) });

// Owners/admins manage every member's connections; others only their own.
async function getAccess(userId: string, workspaceId: string) {
  const membership = await getWorkspaceMembership(userId, workspaceId);
  if (!membership) {
    throw new HTTPException(404, { message: "Workspace not found" });
  }
  return {
    manageAll: membership.role === "owner" || membership.role === "admin",
  };
}

// GET /?workspaceId= - OAuth (MCP) connections bound to a workspace
app.get("/", zValidator("query", workspaceQuerySchema), async (c) => {
  const { userId } = c.get("session");
  const { workspaceId } = c.req.valid("query");
  const { manageAll } = await getAccess(userId, workspaceId);

  const rows = await db
    .select({
      id: oauthConsent.id,
      clientId: oauthConsent.clientId,
      userId: oauthConsent.userId,
      scopes: oauthConsent.scopes,
      connectedAt: oauthConsent.createdAt,
      updatedAt: oauthConsent.updatedAt,
      clientName: oauthClient.name,
      clientUri: oauthClient.uri,
      logoUri: oauthClient.icon,
      redirectUris: oauthClient.redirectUris,
      userName: userTable.name,
      userEmail: userTable.email,
    })
    .from(oauthConsent)
    .innerJoin(oauthClient, eq(oauthClient.clientId, oauthConsent.clientId))
    .leftJoin(userTable, eq(userTable.id, oauthConsent.userId))
    .where(
      and(
        eq(oauthConsent.referenceId, workspaceId),
        manageAll ? undefined : eq(oauthConsent.userId, userId),
      ),
    );

  // Refresh tokens rotate on use, so the newest one marks the last activity.
  const activity = rows.length
    ? await db
        .select({
          clientId: oauthRefreshToken.clientId,
          userId: oauthRefreshToken.userId,
          lastActiveAt: max(oauthRefreshToken.createdAt),
        })
        .from(oauthRefreshToken)
        .where(
          and(
            eq(oauthRefreshToken.referenceId, workspaceId),
            inArray(
              oauthRefreshToken.clientId,
              rows.map((row) => row.clientId),
            ),
            isNull(oauthRefreshToken.revoked),
          ),
        )
        .groupBy(oauthRefreshToken.clientId, oauthRefreshToken.userId)
    : [];

  const connections = rows
    .map(({ redirectUris, ...row }) => ({
      ...row,
      redirectUri: redirectUris[0] ?? null,
      isCurrentUser: row.userId === userId,
      lastActiveAt:
        activity.find(
          (a) => a.clientId === row.clientId && a.userId === row.userId,
        )?.lastActiveAt ?? row.updatedAt,
    }))
    .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

  return c.json({ connections, canManageAll: manageAll });
});

// DELETE /:id?workspaceId= - Disconnect a client: revokes its consent and
// refresh tokens. Outstanding access tokens fail the API's consent check.
app.delete(
  "/:id",
  zValidator("param", connectionIdParamSchema),
  zValidator("query", workspaceQuerySchema),
  async (c) => {
    const { userId } = c.get("session");
    const { id } = c.req.valid("param");
    const { workspaceId } = c.req.valid("query");
    const { manageAll } = await getAccess(userId, workspaceId);

    const [consent] = await db
      .select({
        clientId: oauthConsent.clientId,
        userId: oauthConsent.userId,
      })
      .from(oauthConsent)
      .where(
        and(eq(oauthConsent.id, id), eq(oauthConsent.referenceId, workspaceId)),
      )
      .limit(1);

    if (!consent?.userId || (!manageAll && consent.userId !== userId)) {
      throw new HTTPException(404, { message: "Connection not found" });
    }

    const { clientId, userId: ownerId } = consent;
    await db.transaction(async (tx) => {
      await tx
        .delete(oauthRefreshToken)
        .where(
          and(
            eq(oauthRefreshToken.clientId, clientId),
            eq(oauthRefreshToken.referenceId, workspaceId),
            eq(oauthRefreshToken.userId, ownerId),
          ),
        );
      await tx.delete(oauthConsent).where(eq(oauthConsent.id, id));
    });

    return c.json({ success: true });
  },
);

export default app;
