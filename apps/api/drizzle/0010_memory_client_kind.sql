-- Cross-app memory: which app wrote a memory, and "handoff" (in-progress) notes.
ALTER TABLE memories ADD COLUMN IF NOT EXISTS client text;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS kind text;

CREATE INDEX IF NOT EXISTS memories_handoff_current_idx
  ON memories (workspace_id, user_id, project)
  WHERE kind = 'handoff' AND is_current = true AND deleted_at IS NULL;

-- Transcript ingest idempotency: one live job per chunk hash (failed jobs can be retried).
CREATE UNIQUE INDEX IF NOT EXISTS memory_sources_transcript_hash_uidx
  ON memory_sources (workspace_id, user_id, content_hash)
  WHERE vault_id IS NULL AND content_hash IS NOT NULL AND status <> 'failed';
