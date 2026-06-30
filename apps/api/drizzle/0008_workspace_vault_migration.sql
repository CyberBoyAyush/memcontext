-- Clean workspace/vault migration.
-- After this migration:
-- - workspace_id means top-level team/account/billing boundary.
-- - vault_id means Context Vault boundary.
-- - member memories are workspace-owned and have vault_id NULL.

-- 1. Rename existing Context Vault tables away from the workspace name.
DO $$
BEGIN
  IF to_regclass('public.vaults') IS NULL AND to_regclass('public.workspaces') IS NOT NULL THEN
    ALTER TABLE workspaces RENAME TO vaults;
  END IF;

  IF to_regclass('public.old_vault_members') IS NULL AND to_regclass('public.workspace_members') IS NOT NULL THEN
    ALTER TABLE workspace_members RENAME TO old_vault_members;
  END IF;

  IF to_regclass('public.old_vault_invitations') IS NULL AND to_regclass('public.workspace_invitations') IS NOT NULL THEN
    ALTER TABLE workspace_invitations RENAME TO old_vault_invitations;
  END IF;
END $$;

-- 2. Rename old Context Vault references from workspace_id to vault_id.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'workspace_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memories' AND column_name = 'vault_id') THEN
    ALTER TABLE memories RENAME COLUMN workspace_id TO vault_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_sources' AND column_name = 'workspace_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_sources' AND column_name = 'vault_id') THEN
    ALTER TABLE memory_sources RENAME COLUMN workspace_id TO vault_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_source_chunks' AND column_name = 'workspace_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_source_chunks' AND column_name = 'vault_id') THEN
    ALTER TABLE memory_source_chunks RENAME COLUMN workspace_id TO vault_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_evidence' AND column_name = 'workspace_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_evidence' AND column_name = 'vault_id') THEN
    ALTER TABLE memory_evidence RENAME COLUMN workspace_id TO vault_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_relations' AND column_name = 'workspace_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_relations' AND column_name = 'vault_id') THEN
    ALTER TABLE memory_relations RENAME COLUMN workspace_id TO vault_id;
  END IF;
END $$;

-- 3. Create new top-level workspaces and workspace membership tables.
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by_user_id TEXT NOT NULL,
  billing_owner_user_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_members_workspace_user_new_unique UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  token_hash TEXT NOT NULL UNIQUE,
  invited_by_user_id TEXT NOT NULL,
  accepted_by_user_id TEXT,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mcp_workspace_selections (
  user_id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Add final workspace/vault columns.
ALTER TABLE vaults
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE memories ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE memory_sources ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE memory_source_chunks ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE memory_evidence ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE memory_relations ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS workspace_id UUID;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Old Context Vault constraints can block new per-workspace default rows before
-- the final cleanup section runs.
DO $$
DECLARE
  constraint_name text;
  index_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'vaults'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) = 'UNIQUE (slug)'
  LOOP
    EXECUTE format('ALTER TABLE vaults DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  FOR index_name IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'vaults'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(slug)%'
      AND indexdef NOT ILIKE '%workspace_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
  END LOOP;

  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'subscriptions'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) = 'UNIQUE (user_id)'
  LOOP
    EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  FOR index_name IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(user_id)%'
      AND indexdef NOT ILIKE '%workspace_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'billing_owner_user_id') THEN
    ALTER TABLE vaults ALTER COLUMN billing_owner_user_id DROP NOT NULL;
  END IF;
END $$;

-- 5. Create one real workspace for each old vault and attach the vault.
WITH created AS (
  INSERT INTO workspaces (name, slug, created_by_user_id, billing_owner_user_id, created_at, updated_at)
  SELECT
    v.name,
    v.slug || '-workspace',
    v.created_by_user_id,
    COALESCE(v.billing_owner_user_id, v.created_by_user_id),
    v.created_at,
    NOW()
  FROM vaults v
  WHERE v.workspace_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.slug = v.slug || '-workspace')
  RETURNING id, slug
)
UPDATE vaults v
SET workspace_id = c.id,
    is_default = TRUE,
    updated_at = NOW()
FROM created c
WHERE c.slug = v.slug || '-workspace'
  AND v.workspace_id IS NULL;

-- If the workspace existed from a previous partial run, attach by deterministic slug.
UPDATE vaults v
SET workspace_id = w.id,
    is_default = TRUE,
    updated_at = NOW()
FROM workspaces w
WHERE v.workspace_id IS NULL
  AND w.slug = v.slug || '-workspace'
  AND w.created_by_user_id IS NOT DISTINCT FROM v.created_by_user_id;

-- 6. Move old vault members/invitations to workspace-level rows.
DO $$
BEGIN
  IF to_regclass('public.old_vault_members') IS NOT NULL THEN
    INSERT INTO workspace_members (workspace_id, user_id, role, created_at)
    SELECT DISTINCT v.workspace_id, ovm.user_id, ovm.role, ovm.created_at
    FROM old_vault_members ovm
    JOIN vaults v ON v.id = ovm.workspace_id
    WHERE v.workspace_id IS NOT NULL
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.old_vault_invitations') IS NOT NULL THEN
    INSERT INTO workspace_invitations (
      workspace_id, email, role, token_hash, invited_by_user_id,
      accepted_by_user_id, expires_at, accepted_at, revoked_at, created_at
    )
    SELECT
      v.workspace_id, ovi.email, ovi.role, ovi.token_hash, ovi.invited_by_user_id,
      ovi.accepted_by_user_id, ovi.expires_at, ovi.accepted_at, ovi.revoked_at, ovi.created_at
    FROM old_vault_invitations ovi
    JOIN vaults v ON v.id = ovi.workspace_id
    WHERE v.workspace_id IS NOT NULL
    ON CONFLICT (token_hash) DO NOTHING;
  END IF;
END $$;

-- 7. Create default workspaces for every actor who does not own one.
WITH workspace_actors AS (
  SELECT id AS user_id FROM "user"
  UNION
  SELECT user_id FROM subscriptions WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM api_keys WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM memories WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM memory_sources WHERE user_id IS NOT NULL
), users_without_owned_workspace AS (
  SELECT a.user_id AS id, u.name
  FROM workspace_actors a
  LEFT JOIN "user" u ON u.id = a.user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM workspaces w WHERE w.created_by_user_id = a.user_id
  )
), created_workspaces AS (
  INSERT INTO workspaces (name, slug, created_by_user_id, billing_owner_user_id)
  SELECT
    COALESCE(NULLIF(trim(u.name), ''), 'My') || '''s Workspace',
    'workspace-' || left(md5(u.id), 12),
    u.id,
    u.id
  FROM users_without_owned_workspace u
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, created_by_user_id
)
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, created_by_user_id, 'owner'
FROM created_workspaces
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Ensure each workspace creator is an owner member.
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT w.id, w.created_by_user_id, 'owner'
FROM workspaces w
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 8. Ensure every workspace has a default vault.
INSERT INTO vaults (workspace_id, name, slug, created_by_user_id, is_default)
SELECT w.id, 'Default Vault', 'default-vault', w.created_by_user_id, TRUE
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM vaults v WHERE v.workspace_id = w.id AND v.is_default = TRUE);

-- 9. Backfill workspace_id on vault-derived data.
UPDATE memories m
SET workspace_id = v.workspace_id
FROM vaults v
WHERE m.vault_id = v.id AND m.workspace_id IS NULL;

UPDATE memory_sources ms
SET workspace_id = v.workspace_id
FROM vaults v
WHERE ms.vault_id = v.id AND ms.workspace_id IS NULL;

UPDATE memory_source_chunks msc
SET workspace_id = v.workspace_id
FROM vaults v
WHERE msc.vault_id = v.id AND msc.workspace_id IS NULL;

UPDATE memory_evidence me
SET workspace_id = v.workspace_id
FROM vaults v
WHERE me.vault_id = v.id AND me.workspace_id IS NULL;

UPDATE memory_relations mr
SET workspace_id = v.workspace_id
FROM vaults v
WHERE mr.vault_id = v.id AND mr.workspace_id IS NULL;

-- 10. Backfill old personal memories/sources into each user's owned workspace.
WITH primary_workspace AS (
  SELECT DISTINCT ON (w.created_by_user_id) w.created_by_user_id AS user_id, w.id AS workspace_id
  FROM workspaces w
  ORDER BY w.created_by_user_id, w.created_at ASC, w.id ASC
)
UPDATE memories m
SET workspace_id = pw.workspace_id,
    memory_type = 'member'
FROM primary_workspace pw
WHERE m.workspace_id IS NULL
  AND m.vault_id IS NULL
  AND m.user_id = pw.user_id;

WITH primary_workspace AS (
  SELECT DISTINCT ON (w.created_by_user_id) w.created_by_user_id AS user_id, w.id AS workspace_id
  FROM workspaces w
  ORDER BY w.created_by_user_id, w.created_at ASC, w.id ASC
)
UPDATE memory_sources ms
SET workspace_id = pw.workspace_id
FROM primary_workspace pw
WHERE ms.workspace_id IS NULL
  AND ms.vault_id IS NULL
  AND ms.user_id = pw.user_id;

-- Relations may not point directly at a vault; inherit workspace/vault from the
-- source memory after memory rows have been backfilled.
UPDATE memory_relations mr
SET workspace_id = m.workspace_id,
    vault_id = COALESCE(mr.vault_id, m.vault_id)
FROM memories m
WHERE mr.workspace_id IS NULL
  AND mr.source_id = m.id
  AND m.workspace_id IS NOT NULL;

UPDATE memory_relations mr
SET workspace_id = m.workspace_id,
    vault_id = COALESCE(mr.vault_id, m.vault_id)
FROM memories m
WHERE mr.workspace_id IS NULL
  AND mr.target_id = m.id
  AND m.workspace_id IS NOT NULL;

-- 11. Move subscriptions and API keys to the user's primary owned workspace.
WITH primary_workspace AS (
  SELECT DISTINCT ON (w.created_by_user_id) w.created_by_user_id AS user_id, w.id AS workspace_id
  FROM workspaces w
  ORDER BY w.created_by_user_id, w.created_at ASC, w.id ASC
)
UPDATE subscriptions s
SET workspace_id = pw.workspace_id
FROM primary_workspace pw
WHERE s.workspace_id IS NULL
  AND s.user_id = pw.user_id;

WITH primary_workspace AS (
  SELECT DISTINCT ON (w.created_by_user_id) w.created_by_user_id AS user_id, w.id AS workspace_id
  FROM workspaces w
  ORDER BY w.created_by_user_id, w.created_at ASC, w.id ASC
)
UPDATE api_keys ak
SET workspace_id = pw.workspace_id
FROM primary_workspace pw
WHERE ak.workspace_id IS NULL
  AND ak.user_id = pw.user_id;

-- Create free subscriptions for workspaces without one.
INSERT INTO subscriptions (user_id, workspace_id, plan, memory_count, memory_limit, status)
SELECT
  w.billing_owner_user_id,
  w.id,
  'free',
  COALESCE((
    SELECT count(*)::int
    FROM memories m
    WHERE m.workspace_id = w.id
      AND m.memory_type = 'member'
      AND m.is_current = TRUE
      AND m.deleted_at IS NULL
  ), 0),
  300,
  'active'
FROM workspaces w
WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.workspace_id = w.id);

-- 12. Indexes for the final model.
CREATE INDEX IF NOT EXISTS workspaces_created_by_idx ON workspaces (created_by_user_id);
CREATE INDEX IF NOT EXISTS workspaces_billing_owner_idx ON workspaces (billing_owner_user_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx ON workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_role_idx ON workspace_members (workspace_id, role);
CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_idx ON workspace_invitations (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx ON workspace_invitations (email);
CREATE INDEX IF NOT EXISTS workspace_invitations_token_hash_idx ON workspace_invitations (token_hash);
CREATE INDEX IF NOT EXISTS mcp_workspace_selections_workspace_idx ON mcp_workspace_selections (workspace_id);

CREATE INDEX IF NOT EXISTS vaults_workspace_idx ON vaults (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS vaults_workspace_slug_unique ON vaults (workspace_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS vaults_workspace_default_unique ON vaults (workspace_id) WHERE is_default = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_workspace_unique ON subscriptions (workspace_id);
CREATE INDEX IF NOT EXISTS subscriptions_dodo_subscription_idx ON subscriptions (dodo_subscription_id);

CREATE INDEX IF NOT EXISTS api_keys_workspace_id_idx ON api_keys (workspace_id);
CREATE INDEX IF NOT EXISTS api_keys_user_workspace_idx ON api_keys (user_id, workspace_id);

CREATE INDEX IF NOT EXISTS memories_workspace_member_current_idx
  ON memories (workspace_id, user_id, memory_type)
  WHERE is_current = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS memories_vault_scope_type_current_idx
  ON memories (vault_id, scope, memory_type)
  WHERE is_current = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS memory_sources_vault_status_idx ON memory_sources (vault_id, status);
CREATE INDEX IF NOT EXISTS memory_sources_workspace_vault_idx ON memory_sources (workspace_id, vault_id);
CREATE INDEX IF NOT EXISTS memory_source_chunks_vault_scope_idx ON memory_source_chunks (vault_id, scope, project);
CREATE INDEX IF NOT EXISTS memory_evidence_vault_scope_idx ON memory_evidence (vault_id, scope);
CREATE INDEX IF NOT EXISTS memory_relations_vault_scope_idx ON memory_relations (vault_id, scope);

-- 13. Remove old vault-only leftovers and finalize constraints.
DO $$
DECLARE
  constraint_name text;
  index_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'vaults'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) = 'UNIQUE (slug)'
  LOOP
    EXECUTE format('ALTER TABLE vaults DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'subscriptions'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) = 'UNIQUE (user_id)'
  LOOP
    EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  FOR index_name IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'subscriptions'
      AND indexdef ILIKE '%UNIQUE%'
      AND indexdef ILIKE '%(user_id)%'
      AND indexdef NOT ILIKE '%workspace_id%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vaults' AND column_name = 'billing_owner_user_id') THEN
    ALTER TABLE vaults DROP COLUMN billing_owner_user_id;
  END IF;

  ALTER TABLE vaults ALTER COLUMN workspace_id SET NOT NULL;
  ALTER TABLE subscriptions ALTER COLUMN workspace_id SET NOT NULL;
  ALTER TABLE api_keys ALTER COLUMN workspace_id SET NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vaults_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE vaults ADD CONSTRAINT vaults_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE api_keys ADD CONSTRAINT api_keys_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memories_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE memories ADD CONSTRAINT memories_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memories_vault_id_vaults_id_fk') THEN
    ALTER TABLE memories ADD CONSTRAINT memories_vault_id_vaults_id_fk FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_sources_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE memory_sources ADD CONSTRAINT memory_sources_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_sources_vault_id_vaults_id_fk') THEN
    ALTER TABLE memory_sources ADD CONSTRAINT memory_sources_vault_id_vaults_id_fk FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_source_chunks_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE memory_source_chunks ADD CONSTRAINT memory_source_chunks_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_source_chunks_vault_id_vaults_id_fk') THEN
    ALTER TABLE memory_source_chunks ADD CONSTRAINT memory_source_chunks_vault_id_vaults_id_fk FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_evidence_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE memory_evidence ADD CONSTRAINT memory_evidence_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_evidence_vault_id_vaults_id_fk') THEN
    ALTER TABLE memory_evidence ADD CONSTRAINT memory_evidence_vault_id_vaults_id_fk FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_relations_workspace_id_workspaces_id_fk') THEN
    ALTER TABLE memory_relations ADD CONSTRAINT memory_relations_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memory_relations_vault_id_vaults_id_fk') THEN
    ALTER TABLE memory_relations ADD CONSTRAINT memory_relations_vault_id_vaults_id_fk FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE;
  END IF;
END $$;
