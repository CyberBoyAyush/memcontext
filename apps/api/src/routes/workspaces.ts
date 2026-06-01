import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import {
  eitherAuthMiddleware,
  type EitherAuthContext,
} from "../middleware/either-auth.js";
import {
  acceptWorkspaceInvitation,
  createWorkspace,
  inviteWorkspaceMember,
  listWorkspaces,
} from "../services/workspace.js";

const app = new Hono<{
  Variables: {
    auth: EitherAuthContext;
  };
}>();

app.use("*", eitherAuthMiddleware);

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

app.get("/", async (c) => {
  const { userId } = c.get("auth");
  return c.json(await listWorkspaces(userId));
});

app.post("/", zValidator("json", createWorkspaceSchema), async (c) => {
  const { userId } = c.get("auth");
  const body = c.req.valid("json");
  const workspace = await createWorkspace(userId, body.name);
  return c.json({ workspace }, 201);
});

app.post(
  "/:workspaceId/invitations",
  zValidator("param", workspaceIdParamSchema),
  zValidator("json", inviteSchema),
  async (c) => {
    const { userId } = c.get("auth");
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
      throw new HTTPException(message === "Workspace not found" ? 404 : 403, {
        message,
      });
    }
  },
);

app.post(
  "/invitations/accept",
  zValidator("json", acceptInviteSchema),
  async (c) => {
    const { userId } = c.get("auth");
    const body = c.req.valid("json");

    try {
      return c.json(await acceptWorkspaceInvitation({ userId, token: body.token }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept invitation";
      throw new HTTPException(404, { message });
    }
  },
);

export default app;
