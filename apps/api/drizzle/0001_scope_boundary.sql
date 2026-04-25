ALTER TABLE memories ADD COLUMN scope TEXT;

CREATE INDEX memories_user_scope_current_idx
  ON memories (user_id, scope, is_current, deleted_at);
