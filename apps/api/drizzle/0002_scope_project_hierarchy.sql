CREATE INDEX memories_user_scope_project_current_idx
  ON memories (user_id, scope, project)
  WHERE is_current = true AND deleted_at IS NULL;
