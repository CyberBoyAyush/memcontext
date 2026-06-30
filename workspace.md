# Workspace/Vault Migration Plan

## Goal

Move MemContext from user-owned billing and old Context Vault workspaces to a clean workspace-first model.

Final mental model:

```txt
Workspace = top-level team/account/billing boundary
Member = user inside a workspace
Member memory = user-owned memory inside a workspace pool
Vault = shared Context Vault inside a workspace
Vault memory = shared document/company memory inside a vault
Subscription = workspace-owned plan, usage, and billing state
API key = user-owned credential bound to one workspace
```

This migration prioritizes a clean long-term database structure over backward compatibility. Current usage is low, so we should avoid carrying legacy naming forever.

## Validated Decisions

- Use the clean rename-first model.
- Existing Context Vault `workspaces` become `vaults`.
- Existing memory/source `workspace_id` columns become `vault_id` where they currently refer to Context Vault data.
- New `workspaces` table represents the real team/account/billing entity.
- Users with no existing workspace get an automatically created default workspace during migration.
- Every workspace gets a default vault during migration.
- Existing personal memories and old API keys are assigned to the user's own primary/default owned workspace.
- Rename `memory_type = 'user'` to `memory_type = 'member'` during migration.
- Existing subscriptions move to one primary owned/default workspace only. Do not duplicate paid quota across every workspace a user owns.
- API keys are workspace-bound. Old keys are backfilled; new keys require workspace selection.
- Default MCP/API-key memory search returns only the key owner's member memories in the bound workspace, even if the key owner is an admin/owner.
- Admin-wide member memory audit is a separate dashboard/API flow.
- Only workspace owners can change billing state. Admins can view usage/billing but cannot checkout/change/cancel plans.

## Current Schema Summary

Current important tables:

```txt
subscriptions
  user_id unique
  plan
  memory_count
  memory_limit
  dodo_customer_id
  dodo_subscription_id
  status

api_keys
  user_id
  key_prefix
  key_hash
  name

workspaces
  id
  name
  slug
  created_by_user_id
  billing_owner_user_id

workspace_members
  workspace_id -> workspaces.id
  user_id
  role

workspace_invitations
  workspace_id -> workspaces.id
  email
  role
  token_hash

memories
  user_id
  workspace_id nullable
  memory_type default 'user'
  scope
  project
  content

memory_sources / memory_source_chunks / memory_evidence / memory_relations
  user_id
  workspace_id nullable
  scope/project related fields
```

Current problem:

```txt
workspaces currently means Context Vault, not real account workspace.
memories.workspace_id currently means Context Vault ID for document/company memories.
personal memories currently use workspace_id = null and memory_type = 'user'.
subscriptions are user-owned.
api_keys are user-owned with no workspace context.
```

## Target Schema

### workspaces

Top-level team/account/billing boundary.

```txt
workspaces
  id uuid primary key
  name text not null
  slug text not null unique
  created_by_user_id text not null
  billing_owner_user_id text not null
  created_at timestamp not null
  updated_at timestamp not null
```

### workspace_members

Membership and role inside a workspace.

```txt
workspace_members
  id uuid primary key
  workspace_id uuid not null references workspaces(id) on delete cascade
  user_id text not null
  role text not null default 'member'
  created_at timestamp not null

unique(workspace_id, user_id)
```

Roles:

```txt
owner  = full workspace, members, vault, billing management
admin  = workspace/vault management, billing/usage view only
member = shared member-memory search + own memory management + shared vault read/write
viewer = read-only shared vault access; no writes
```

### workspace_invitations

Invites happen only at workspace level, not vault level.

```txt
workspace_invitations
  id uuid primary key
  workspace_id uuid not null references workspaces(id) on delete cascade
  email text not null
  role text not null default 'member'
  token_hash text not null unique
  invited_by_user_id text not null
  accepted_by_user_id text
  expires_at timestamp not null
  accepted_at timestamp
  revoked_at timestamp
  created_at timestamp not null
```

### vaults

Shared Context Vault container inside a workspace.

```txt
vaults
  id uuid primary key
  workspace_id uuid not null references workspaces(id) on delete cascade
  name text not null
  slug text not null
  created_by_user_id text not null
  is_default boolean not null default false
  created_at timestamp not null
  updated_at timestamp not null

unique(workspace_id, slug)
```

### subscriptions

Billing and quota state belongs to workspace, not user.

```txt
subscriptions
  id uuid primary key
  workspace_id uuid not null unique references workspaces(id) on delete cascade
  plan text not null default 'free'
  memory_count integer not null default 0
  memory_limit integer not null default 300
  dodo_customer_id text
  dodo_subscription_id text
  status text not null default 'active'
  created_at timestamp not null
  updated_at timestamp not null
```

Remove/deprecate user-owned subscription behavior:

```txt
subscriptions.user_id
```

During implementation this can be kept temporarily for migration safety, but final code should not use it.

### api_keys

API keys are created by a user and bound to one workspace.

```txt
api_keys
  id uuid primary key
  user_id text not null
  workspace_id uuid not null references workspaces(id) on delete cascade
  key_prefix text not null
  key_hash text not null unique
  name text not null
  last_used_at timestamp
  created_at timestamp not null
```

Optional later:

```txt
default_vault_id uuid references vaults(id)
permissions jsonb or text[]
```

Do not add these until there is a concrete product need.

### memories

All memories belong to a workspace. Vault ID is nullable because member memories do not belong to a vault.

```txt
memories
  id uuid primary key
  workspace_id uuid not null references workspaces(id) on delete cascade
  vault_id uuid references vaults(id) on delete set null
  user_id text not null
  memory_type text not null default 'member'
  scope text
  project text
  content text not null
  embedding vector(1536) not null
  category text
  source text not null
  is_current boolean not null default true
  supersedes_id uuid
  root_id uuid
  version integer not null default 1
  deleted_at timestamp
  valid_from timestamp
  valid_until timestamp
  created_at timestamp not null
```

Memory types:

```txt
member   = workspace-owned member/user memory; vault_id is null
document = extracted vault memory; vault_id is required
company  = curated shared vault memory/fact; vault_id is required
```

### memory_sources, chunks, evidence, relations

These should also carry workspace and vault context.

```txt
memory_sources.workspace_id not null
memory_sources.vault_id nullable

memory_source_chunks.workspace_id not null
memory_source_chunks.vault_id nullable

memory_evidence.workspace_id not null
memory_evidence.vault_id nullable

memory_relations.workspace_id not null
memory_relations.vault_id nullable
```

For member memories, `vault_id` stays null.

For document/company/vault data, `vault_id` is required at service level.

## Required Indexes

Use exact names when implementing according to Drizzle/project style.

```txt
workspaces_created_by_idx(created_by_user_id)
workspaces_billing_owner_idx(billing_owner_user_id)

workspace_members_workspace_user_unique(workspace_id, user_id)
workspace_members_user_idx(user_id)
workspace_members_workspace_idx(workspace_id)

workspace_invitations_workspace_idx(workspace_id)
workspace_invitations_email_idx(email)
workspace_invitations_token_hash_idx(token_hash)

vaults_workspace_idx(workspace_id)
vaults_workspace_slug_unique(workspace_id, slug)
vaults_workspace_default_idx(workspace_id, is_default)

subscriptions_workspace_unique(workspace_id)
subscriptions_dodo_subscription_idx(dodo_subscription_id)

api_keys_user_id_idx(user_id)
api_keys_workspace_id_idx(workspace_id)
api_keys_user_workspace_idx(user_id, workspace_id)

memories_workspace_member_current_idx(workspace_id, user_id, memory_type, is_current, deleted_at)
memories_workspace_scope_project_current_idx(workspace_id, scope, project)
memories_vault_scope_type_current_idx(vault_id, scope, memory_type)
memories_embedding_idx using hnsw

memory_sources_workspace_status_idx(workspace_id, status)
memory_sources_vault_status_idx(vault_id, status)
memory_sources_vault_content_hash_idx(vault_id, content_hash)

memory_source_chunks_workspace_scope_idx(workspace_id, scope, project)
memory_source_chunks_vault_scope_idx(vault_id, scope, project)

memory_evidence_workspace_scope_idx(workspace_id, scope)
memory_evidence_vault_scope_idx(vault_id, scope)

memory_relations_workspace_scope_idx(workspace_id, scope)
memory_relations_vault_scope_idx(vault_id, scope)
```

## Core Service Invariants

After migration, new code should follow these invariants:

```txt
workspace_id is the account/team/billing/security boundary.
vault_id is only for Context Vault filtering and shared document/company knowledge.
member memories never require vault_id.
subscriptions are looked up by workspace_id.
API keys resolve to user_id + workspace_id.
Every authenticated operation verifies workspace membership.
```

Bad patterns to remove:

```ts
checkMemoryLimit(userId)
getSubscriptionData(userId)
saveMemory({ userId, ... }) without workspace context
searchMemories({ userId, ... }) without workspace context
```

Replacement patterns:

```ts
resolveWorkspaceContext({ userId, workspaceId })
checkWorkspaceMemoryLimit(workspaceId)
getWorkspaceSubscriptionData(workspaceId)
saveMemberMemory({ userId, workspaceId, ... })
searchMemberMemories({ userId, workspaceId, ... })
saveVaultMemory({ userId, workspaceId, vaultId, ... })
searchVaultMemories({ userId, workspaceId, vaultId, ... })
```

## Workspace Context Resolution

Every dashboard/session route should resolve context like this:

```txt
session user_id
request workspace_id
workspace_members row must exist
role controls permission
subscription loaded by workspace_id
```

Every API-key/MCP request should resolve context like this:

```txt
X-API-Key
-> api_keys row
-> user_id + workspace_id
-> verify user is still workspace member
-> attach workspace context to request
```

If a user is removed from a workspace, their workspace-bound API keys should stop working for that workspace because membership validation fails.

## Member Memory Save Flow

Member memory means the user/member memory pool inside a workspace.

Input:

```txt
user_id
workspace_id
content
scope optional
project optional
category optional
valid_until optional
```

Checks:

```txt
1. User must be a workspace member.
2. Viewer cannot write member memories.
3. Workspace subscription memory limit must allow the write.
4. Scope remains the hard isolation boundary inside that workspace.
```

Saved row:

```txt
memories.workspace_id = active workspace
memories.vault_id = null
memories.user_id = current user
memories.memory_type = 'member'
```

Quota:

```txt
increment subscriptions.memory_count for workspace_id
```

Search behavior:

```txt
MCP/API key default search:
  workspace_id = key.workspace_id
  user_id = key.user_id
  memory_type = 'member'
  vault_id IS NULL

Dashboard regular member search:
  workspace_id = active workspace
  user_id = current user
  memory_type = 'member'
  vault_id IS NULL

Dashboard owner/admin audit search:
  workspace_id = active workspace
  memory_type = 'member'
  vault_id IS NULL
```

Do not let default MCP search return every workspace member's memory, even if the API key owner is an owner/admin. Admin-wide memory audit should be explicit and separate.

## Vault Memory Save Flow

Vault memory means shared Context Vault knowledge.

Input:

```txt
user_id
workspace_id
vault_id
content/document/fact
scope optional
project optional
```

Checks:

```txt
1. User must be a workspace member.
2. Vault must belong to the same workspace.
3. Viewer can read but cannot ingest/write/delete/correct.
4. Workspace document/credit limits must allow the operation.
```

Document extracted memory row:

```txt
memories.workspace_id = active workspace
memories.vault_id = selected vault
memories.user_id = uploader/processor user
memories.memory_type = 'document'
```

Curated company fact row:

```txt
memories.workspace_id = active workspace
memories.vault_id = selected vault
memories.user_id = creator user
memories.memory_type = 'company'
```

Search behavior:

```txt
workspace_id = active workspace
vault_id = selected vault
memory_type IN ('document', 'company')
scope/project filters apply inside vault
```

## Billing Flow

Billing belongs to workspace.

Checkout route shape:

```txt
POST /api/workspaces/:workspaceId/billing/checkout
```

Checks before checkout:

```txt
1. User must be workspace owner.
2. Workspace must exist.
3. Plan must be valid.
```

Dodo checkout metadata must include:

```json
{
  "workspace_id": "ws_123",
  "billing_owner_user_id": "user_abc",
  "plan": "pro"
}
```

Webhook resolution:

```txt
1. Read metadata.workspace_id.
2. Verify workspace exists.
3. Map Dodo product to internal plan.
4. Upsert/update subscriptions where workspace_id = metadata.workspace_id.
5. Store dodo_customer_id and dodo_subscription_id on that workspace subscription.
6. Invalidate API key/subscription caches for affected workspace keys.
```

Plan changes/cancellations:

```txt
Only workspace owners can change plan/cancel/update billing.
Admins can view billing/usage but cannot mutate payment state.
```

Subscription lookup should never depend on user ID after migration.

## API Key Flow

### Old API keys

Old keys currently only have `user_id`. During migration:

```txt
api_keys.workspace_id = user's primary/default owned workspace
```

After backfill:

```txt
api_keys.workspace_id SET NOT NULL
```

Old keys keep working, but now operate inside the user's default/primary workspace.

### New API keys

Dashboard creation flow:

```txt
1. User selects workspace.
2. API verifies membership.
3. Create API key with user_id + workspace_id.
```

API key row:

```txt
user_id = current user
workspace_id = selected workspace
name = user-provided name
```

Request resolution:

```txt
X-API-Key
-> api_keys.user_id
-> api_keys.workspace_id
-> verify workspace_members(user_id, workspace_id)
-> save/search inside that workspace
```

Default MCP save:

```txt
workspace_id = api_keys.workspace_id
vault_id = null
user_id = api_keys.user_id
memory_type = 'member'
```

Default MCP search:

```txt
workspace_id = api_keys.workspace_id
vault_id IS NULL
user_id = api_keys.user_id
memory_type = 'member'
```

Vault APIs may accept `vaultId` explicitly, but should verify:

```txt
vaults.id = vaultId
vaults.workspace_id = api_keys.workspace_id
```

## Migration Strategy

The implementation should be done as one carefully reviewed migration or a small ordered migration series. Because this changes core semantics, wrap data updates in transactions where possible.

### Phase 1: Prepare clean names

Rename current Context Vault tables out of the way:

```sql
ALTER TABLE workspaces RENAME TO vaults;
ALTER TABLE workspace_members RENAME TO old_vault_members;
ALTER TABLE workspace_invitations RENAME TO old_vault_invitations;
```

Rename old Context Vault foreign-key columns to `vault_id`:

```sql
ALTER TABLE memories RENAME COLUMN workspace_id TO vault_id;
ALTER TABLE memory_sources RENAME COLUMN workspace_id TO vault_id;
ALTER TABLE memory_source_chunks RENAME COLUMN workspace_id TO vault_id;
ALTER TABLE memory_evidence RENAME COLUMN workspace_id TO vault_id;
ALTER TABLE memory_relations RENAME COLUMN workspace_id TO vault_id;
```

Drop/recreate affected indexes with correct names. Existing indexes named `workspace_*` that now index `vault_id` should be renamed/recreated to avoid misleading names.

### Phase 2: Create real workspace tables

Create new clean tables:

```txt
workspaces
workspace_members
workspace_invitations
```

Add `workspace_id` to `vaults`:

```sql
ALTER TABLE vaults ADD COLUMN workspace_id UUID;
ALTER TABLE vaults ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT true;
```

Add new real workspace IDs to data tables:

```sql
ALTER TABLE memories ADD COLUMN workspace_id UUID;
ALTER TABLE memory_sources ADD COLUMN workspace_id UUID;
ALTER TABLE memory_source_chunks ADD COLUMN workspace_id UUID;
ALTER TABLE memory_evidence ADD COLUMN workspace_id UUID;
ALTER TABLE memory_relations ADD COLUMN workspace_id UUID;
ALTER TABLE api_keys ADD COLUMN workspace_id UUID;
ALTER TABLE subscriptions ADD COLUMN workspace_id UUID;
```

### Phase 3: Create workspaces from old vaults

For every row in `vaults` that came from old `workspaces`:

```txt
create new workspaces row
  name = vault.name
  slug = unique workspace slug based on vault.slug/name
  created_by_user_id = vault.created_by_user_id
  billing_owner_user_id = old vault billing_owner_user_id or created_by_user_id

update vaults.workspace_id = new workspace.id
```

Copy old vault members into the new workspace membership table:

```txt
old_vault_members.workspace_id was old vault id
new workspace_members.workspace_id = vaults.workspace_id
new workspace_members.user_id = old_vault_members.user_id
new workspace_members.role = old_vault_members.role
```

Old vault invitations can either be migrated to the new workspace invitations or revoked. Recommended:

```txt
Migrate unaccepted, unexpired, non-revoked old_vault_invitations to workspace_invitations using vaults.workspace_id.
```

### Phase 4: Create default workspaces for users without owned workspace

For every auth user with no owned/default workspace:

```txt
create workspace
  name = "{user.name}'s Workspace" or "My Workspace"
  slug = generated unique slug
  created_by_user_id = user.id
  billing_owner_user_id = user.id

create workspace_members
  workspace_id = created workspace
  user_id = user.id
  role = owner
```

Also create a default vault for every workspace that does not have one:

```txt
vaults.workspace_id = workspace.id
name = "Default Vault" or "Context Vault"
slug = "default-vault"
created_by_user_id = workspace.created_by_user_id
is_default = true
```

### Phase 5: Backfill memory workspace IDs

Vault/document/company memories:

```txt
For memories where vault_id IS NOT NULL:
  workspace_id = vaults.workspace_id
```

Member memories:

```txt
For old personal memories where vault_id IS NULL and memory_type = 'user':
  workspace_id = user's primary/default owned workspace
  memory_type = 'member'
```

Related tables:

```txt
memory_sources.workspace_id = vaults.workspace_id where vault_id is not null
memory_source_chunks.workspace_id = vaults.workspace_id where vault_id is not null
memory_evidence.workspace_id = vaults.workspace_id where vault_id is not null
memory_relations.workspace_id = vaults.workspace_id where vault_id is not null
```

For queued/long member memory sources with no vault:

```txt
workspace_id = user's primary/default owned workspace
vault_id = null
```

### Phase 6: Backfill subscriptions

For each old user-owned subscription:

```txt
workspace_id = user's primary/default owned workspace
```

Primary workspace selection:

```txt
1. Workspace where billing_owner_user_id = user.id
2. Oldest workspace where user is owner
3. Generated default workspace
```

Do not duplicate paid plans across all owned workspaces.

For workspaces without subscription row:

```txt
create free subscription
  workspace_id = workspace.id
  plan = 'free'
  memory_count = computed workspace member memory count
  memory_limit = PLAN_LIMITS.free
  status = 'active'
```

Recompute `memory_count` from current member memories if possible:

```txt
count memories where workspace_id = workspace.id
  and memory_type = 'member'
  and is_current = true
  and deleted_at is null
```

### Phase 7: Backfill API keys

For every old API key:

```txt
api_keys.workspace_id = api_keys.user_id primary/default owned workspace
```

After this, code should validate membership on every key request.

### Phase 8: Enforce constraints

Only after all backfills pass:

```txt
vaults.workspace_id SET NOT NULL
memories.workspace_id SET NOT NULL
memory_sources.workspace_id SET NOT NULL where applicable
memory_source_chunks.workspace_id SET NOT NULL where applicable
memory_evidence.workspace_id SET NOT NULL where applicable
api_keys.workspace_id SET NOT NULL
subscriptions.workspace_id SET NOT NULL
subscriptions.workspace_id UNIQUE
```

Keep `memories.vault_id` nullable.

For document/company memories, enforce vault requirement in service code. A database check constraint can be added later:

```txt
memory_type = 'member' -> vault_id IS NULL
memory_type IN ('document', 'company') -> vault_id IS NOT NULL
```

## Code Update Map

### API service files

Likely affected files:

```txt
apps/api/src/db/schema.ts
apps/api/src/services/subscription.ts
apps/api/src/services/workspace.ts
apps/api/src/services/memory.ts
apps/api/src/services/context-vault.ts
apps/api/src/services/dodo-webhooks.ts
apps/api/src/middleware/auth.ts
apps/api/src/middleware/either-auth.ts
apps/api/src/routes/memories.ts
apps/api/src/routes/context-vault.ts
apps/api/src/routes/workspaces.ts
apps/api/src/routes/subscription.ts
apps/api/src/routes/api-keys.ts
```

Main service changes:

```txt
subscription.ts:
  move all limit checks to workspace_id
  replace getSubscriptionData(userId) with getWorkspaceSubscriptionData(workspaceId)

workspace.ts:
  manage real workspaces, members, invitations
  add default workspace creation helper

memory.ts:
  save/search/list/get/update/delete require workspace context
  member memories use workspace_id + user_id + memory_type member
  vault memories use workspace_id + vault_id

context-vault.ts:
  rename route/service vocabulary to vault where appropriate
  require workspaceId + vaultId for vault operations

dodo-webhooks.ts:
  resolve workspace_id from payment metadata
  update subscriptions by workspace_id

auth.ts:
  API key validation returns workspace_id and validates membership
```

### Dashboard files

Likely affected files:

```txt
apps/dashboard/src/lib/queries/context-vault.ts
apps/dashboard/src/lib/queries/memories.ts
apps/dashboard/src/lib/queries/api-keys.ts
apps/dashboard/src/lib/queries/user/subscription equivalent
apps/dashboard/src/components/workspace-select.tsx
apps/dashboard/src/components/memory-source-switcher.tsx
apps/dashboard/src/components/settings/workspaces-section.tsx
apps/dashboard/src/app/(dashboard)/context-vault/page.tsx
apps/dashboard/src/app/(dashboard)/memories/page.tsx
apps/dashboard/src/app/(dashboard)/subscription/page.tsx
apps/dashboard/src/app/(dashboard)/api-keys/page.tsx
```

Dashboard UX updates:

```txt
Workspace selector = top-level workspace/team selector
Vault selector = Context Vault selector inside selected workspace
API key creation requires workspace selection
Billing page uses selected workspace subscription
Memories page shows member memories for selected workspace
Admin audit view is explicit for owner/admin
Context Vault page uses workspace + vault
```

### SDK/types/docs

Likely affected:

```txt
packages/types/src/memory.ts
packages/types/src/api.ts
packages/types/src/user.ts
packages/sdk/src/types.ts
packages/sdk/src/client.ts
docs/openapi.yaml
docs/**/*.mdx
```

Important SDK rule: the published `memcontext-sdk` is self-contained and must mirror public types directly.

## Route Shape Recommendation

Workspace routes:

```txt
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:workspaceId/team
POST   /api/workspaces/:workspaceId/invitations
PATCH  /api/workspaces/:workspaceId/members/:memberId
DELETE /api/workspaces/:workspaceId/members/:memberId
POST   /api/workspaces/:workspaceId/billing/checkout
POST   /api/workspaces/:workspaceId/billing/change-plan
GET    /api/workspaces/:workspaceId/subscription
```

Vault routes:

```txt
GET    /api/workspaces/:workspaceId/vaults
POST   /api/workspaces/:workspaceId/vaults
GET    /api/workspaces/:workspaceId/vaults/:vaultId/hierarchy
GET    /api/workspaces/:workspaceId/vaults/:vaultId/documents
POST   /api/workspaces/:workspaceId/vaults/:vaultId/documents
POST   /api/workspaces/:workspaceId/vaults/:vaultId/documents/upload
GET    /api/workspaces/:workspaceId/vaults/:vaultId/memories
POST   /api/workspaces/:workspaceId/vaults/:vaultId/memories
```

The public route prefix is `/api/context-vault`, matching the Context Vault product naming while internally using workspace/vault IDs.

Memory routes:

```txt
POST /api/memories
GET  /api/memories/search
GET  /api/memories
```

For dashboard/session calls, these should include workspace context explicitly.

For API key/MCP calls, workspace context comes from `api_keys.workspace_id`.

## Permission Matrix

```txt
owner
  manage workspace
  manage members
  manage billing
  create/update/delete vaults
  read/write vault memories
  audit all member memories
  create member memories in the shared workspace pool

admin
  manage most workspace/vault content
  view billing/usage only
  invite/manage non-owner members if allowed
  read/write vault memories
  audit all member memories
  create member memories in the shared workspace pool

member
  read/write shared vault content
  create/search shared workspace member memories
  cannot update/delete other members' memories
  cannot manage billing

viewer
  read shared vault content
  cannot write vault content
  cannot create member memories unless product later allows it
  cannot manage billing/members
```

## Open Implementation Questions

These were validated enough for the doc, but implementation may still need exact names:

- Default workspace name: use `"{user.name}'s Workspace"`, fallback `"My Workspace"`.
- Default vault name: use `"Default Vault"` or `"Context Vault"`. Recommended: `"Default Vault"` in DB, product can label it as Context Vault.
- Public routes use `/api/context-vault`; internals use workspace/vault concepts.
- Whether member memories count all source/reserved slots exactly like current personal memories. Recommended: yes, but count by workspace subscription.
- Whether document/company vault memories count against the workspace member-memory pool. Current beta behavior says document memories do not increment workspace member-memory count. Preserve that unless pricing changes.

## Verification Checklist

After implementation:

```txt
pnpm --filter=@memcontext/api build
pnpm --filter=@memcontext/dashboard build
pnpm --filter=@memcontext/api lint
pnpm --filter=@memcontext/dashboard lint
pnpm --filter=memcontext-sdk check-types if SDK touched
pnpm --filter=memcontext-sdk build if SDK touched
```

Data verification queries should confirm:

```txt
No active user lacks workspace membership.
No workspace lacks a default vault.
No current memory has null workspace_id.
All member memories have vault_id null.
All document/company memories have vault_id not null.
All subscriptions have workspace_id.
All API keys have workspace_id.
Every API key user is still a member of its workspace.
```

## Final Summary

Clean final structure:

```txt
Workspace owns members, billing, quota, API keys, and all memory pools.
Member memories are user-owned slices inside workspace quota.
Vaults are shared Context Vault containers inside a workspace.
Vault memories are shared document/company knowledge inside a vault.
Dodo/payment state is stored on workspace subscriptions.
API keys resolve to one user and one workspace automatically.
```

The migration is bigger than the minimal-churn approach, but the resulting schema is much clearer:

```txt
workspace_id always means workspace/team/account.
vault_id always means Context Vault.
user_id always means actor/creator/member owner.
```
