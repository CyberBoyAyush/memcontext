CREATE TABLE IF NOT EXISTS memory_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  scope TEXT,
  project TEXT,
  category TEXT,
  source TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'pending',
  reserved_slots INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memory_sources_user_status_idx
  ON memory_sources (user_id, status);

CREATE INDEX IF NOT EXISTS memory_sources_status_created_idx
  ON memory_sources (status, created_at);
