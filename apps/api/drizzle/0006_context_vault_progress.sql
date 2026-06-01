ALTER TABLE memory_sources
  ADD COLUMN IF NOT EXISTS total_chunks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_chunks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_phase TEXT,
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS memory_sources_workspace_phase_idx
  ON memory_sources (workspace_id, processing_phase);
