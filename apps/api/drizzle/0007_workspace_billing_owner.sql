ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS billing_owner_user_id TEXT;

UPDATE workspaces
SET billing_owner_user_id = created_by_user_id
WHERE billing_owner_user_id IS NULL;

ALTER TABLE workspaces
  ALTER COLUMN billing_owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS workspaces_billing_owner_idx
  ON workspaces (billing_owner_user_id);
