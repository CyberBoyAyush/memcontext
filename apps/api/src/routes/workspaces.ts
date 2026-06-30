import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  inviteWorkspaceMember,
  listWorkspaceTeam,
  listWorkspaces,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  updateWorkspaceBillingOwner,
  updateWorkspaceMemberRole,
} from "../services/workspace.js";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

app.use("*", sessionAuthMiddleware);

const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const inviteSchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

const acceptInviteSchema = z.object({
  token: z.string().min(32).max(128),
});

const workspaceIdParamSchema = z.object({
  workspaceId: z.string().uuid(),
});

const memberIdParamSchema = workspaceIdParamSchema.extend({
  memberId: z.string().uuid(),
});

const invitationIdParamSchema = workspaceIdParamSchema.extend({
  invitationId: z.string().uuid(),
});

app.get("/", async (c) => {
  const { userId } = c.get("session");
  return c.json(await listWorkspaces(userId));
});

app.post("/", zValidator("json", createWorkspaceSchema), async (c) => {
  const { userId } = c.get("session");
  const body = c.req.valid("json");
  const workspace = await createWorkspace(userId, body.name);
  return c.json({ workspace }, 201);
});

app.post(
  "/:workspaceId/invitations",
  zValidator("param", workspaceIdParamSchema),
  zValidator("json", inviteSchema),
  async (c) => {
    const { userId } = c.get("session");
    const { workspaceId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      const result = await inviteWorkspaceMember({
        userId,
        workspaceId,
        email: body.email,
        role: body.role,
      });
      return c.json(result, 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create invitation";
      if (message === "Workspace not found") {
        throw new HTTPException(404, { message });
      }
      if (
        message === "User is already a workspace member" ||
        message === "Invitation already pending"
      ) {
        throw new HTTPException(400, { message });
      }
      if (message === "Failed to send auth email") {
        throw new HTTPException(500, { message: "Failed to send invitation" });
      }
      throw new HTTPException(403, { message });
    }
  },
);

app.get(
  "/:workspaceId/team",
  zValidator("param", workspaceIdParamSchema),
  async (c) => {
    const { userId } = c.get("session");
    const { workspaceId } = c.req.valid("param");

    try {
      return c.json(await listWorkspaceTeam({ userId, workspaceId }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to list workspace team";
      throw new HTTPException(message === "Workspace not found" ? 404 : 500, {
        message,
      });
    }
  },
);

app.patch(
  "/:workspaceId/billing-owner",
  zValidator("param", workspaceIdParamSchema),
  zValidator("json", z.object({ userId: z.string().min(1) })),
  async (c) => {
    const { userId } = c.get("session");
    const { workspaceId } = c.req.valid("param");
    const body = c.req.valid("json");

    try {
      return c.json(
        await updateWorkspaceBillingOwner({
          userId,
          workspaceId,
          billingOwnerUserId: body.userId,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update billing owner";
      if (message === "Workspace not found") {
        throw new HTTPException(404, { message });
      }
      if (message === "Billing owner must be a workspace member") {
        throw new HTTPException(400, { message });
      }
      throw new HTTPException(403, { message });
    }
  },
);

app.patch(
  "/:workspaceId/members/:memberId",
  zValidator("param", memberIdParamSchema),
  zValidator("json", z.object({ role: z.enum(["admin", "member", "viewer"]) })),
  async (c) => {
    const { userId } = c.get("session");
    const { workspaceId, memberId } = c.req.valid("param");
    const { role } = c.req.valid("json");

    try {
      return c.json(
        await updateWorkspaceMemberRole({
          userId,
          workspaceId,
          memberId,
          role,
        }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update member";
      if (message === "Workspace not found" || message === "Member not found") {
        throw new HTTPException(404, { message });
      }
      throw new HTTPException(403, { message });
    }
  },
);

app.delete(
  "/:workspaceId/members/:memberId",
  zValidator("param", memberIdParamSchema),
  async (c) => {
    const { userId } = c.get("session");
    const { workspaceId, memberId } = c.req.valid("param");

    try {
      return c.json(
        await removeWorkspaceMember({ userId, workspaceId, memberId }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      if (message === "Workspace not found" || message === "Member not found") {
        throw new HTTPException(404, { message });
      }
      throw new HTTPException(403, { message });
    }
  },
);

app.delete(
  "/:workspaceId/invitations/:invitationId",
  zValidator("param", invitationIdParamSchema),
  async (c) => {
    const { userId } = c.get("session");
    const { workspaceId, invitationId } = c.req.valid("param");

    try {
      return c.json(
        await revokeWorkspaceInvitation({ userId, workspaceId, invitationId }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke invitation";
      if (
        message === "Workspace not found" ||
        message === "Invitation not found"
      ) {
        throw new HTTPException(404, { message });
      }
      throw new HTTPException(403, { message });
    }
  },
);

app.post(
  "/invitations/accept",
  zValidator("json", acceptInviteSchema),
  async (c) => {
    const { userId } = c.get("session");
    const body = c.req.valid("json");

    try {
      return c.json(
        await acceptWorkspaceInvitation({ userId, token: body.token }),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept invitation";
      throw new HTTPException(404, { message });
    }
  },
);

export default app;
