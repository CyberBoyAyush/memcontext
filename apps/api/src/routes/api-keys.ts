import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { db, apiKeys, workspaces } from "../db/index.js";
import {
  sessionAuthMiddleware,
  type SessionContext,
} from "../middleware/session-auth.js";
import {
  generateApiKey,
  extractKeyPrefix,
  hashApiKey,
} from "../utils/index.js";
import { invalidateApiKey } from "../services/cache.js";
import { eq, and } from "drizzle-orm";
import type { CreateApiKeyResponse, ApiKey } from "@memcontext/types";
import { getOrCreateDefaultWorkspace } from "../services/subscription.js";
import { requireWorkspaceMember } from "../services/workspace.js";

const app = new Hono<{
  Variables: {
    session: SessionContext;
  };
}>();

// All routes require session authentication
app.use("*", sessionAuthMiddleware);

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  workspaceId: z.string().uuid().optional(),
});

const apiKeyIdParamSchema = z.object({
  id: z.string().uuid("Invalid API key ID format"),
});

// POST / - Create API key
app.post("/", zValidator("json", createApiKeySchema), async (c) => {
  const { userId } = c.get("session");
  const body = c.req.valid("json");

  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = extractKeyPrefix(key);
  const workspaceId = body.workspaceId ?? (await getOrCreateDefaultWorkspace(userId));
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new HTTPException(403, {
      message: "Only workspace owners and admins can create API keys",
    });
  }

  const [newKey] = await db
    .insert(apiKeys)
    .values({
      userId,
      workspaceId,
      name: body.name,
      keyHash,
      keyPrefix,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      workspaceId: apiKeys.workspaceId,
      createdAt: apiKeys.createdAt,
    });

  const response: CreateApiKeyResponse = {
    id: newKey.id,
    name: newKey.name,
    keyPrefix: newKey.keyPrefix,
    workspaceId: newKey.workspaceId ?? workspaceId,
    key,
    createdAt: newKey.createdAt,
  };

  return c.json(response, 201);
});

// GET / - List API keys
app.get("/", async (c) => {
  const { userId } = c.get("session");

  const keys = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
      workspaceId: apiKeys.workspaceId,
      workspaceName: workspaces.name,
      keyPrefix: apiKeys.keyPrefix,
      name: apiKeys.name,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .leftJoin(workspaces, eq(apiKeys.workspaceId, workspaces.id))
    .where(eq(apiKeys.userId, userId));

  const formattedKeys: ApiKey[] = keys.map((k) => ({
    id: k.id,
    userId: k.userId,
    workspaceId: k.workspaceId,
    workspaceName: k.workspaceName ?? undefined,
    keyPrefix: k.keyPrefix,
    name: k.name,
    lastUsedAt: k.lastUsedAt ?? undefined,
    createdAt: k.createdAt,
  }));

  return c.json({ keys: formattedKeys });
});

// DELETE /:id - Delete API key
app.delete("/:id", zValidator("param", apiKeyIdParamSchema), async (c) => {
  const { userId } = c.get("session");
  const { id: keyId } = c.req.valid("param");

  const [deletedKey] = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ keyHash: apiKeys.keyHash });

  if (!deletedKey) {
    throw new HTTPException(404, { message: "API key not found" });
  }

  await invalidateApiKey(deletedKey.keyHash);

  return c.json({ success: true });
});

export default app;
