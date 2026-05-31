ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS memory_type TEXT NOT NULL DEFAULT 'user';

ALTER TABLE memory_sources
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS parser_version TEXT,
  ADD COLUMN IF NOT EXISTS chunker_version TEXT,
  ADD COLUMN IF NOT EXISTS extractor_version TEXT,
  ADD COLUMN IF NOT EXISTS chunk_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extracted_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMP;

ALTER TABLE memory_relations
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS workspace_id UUID,
  ADD COLUMN IF NOT EXISTS scope TEXT;

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by_user_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_members_workspace_user_unique UNIQUE (workspace_id, user_id)
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

CREATE TABLE IF NOT EXISTS memory_source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES memory_sources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  workspace_id UUID,
  scope TEXT,
  project TEXT,
  chunk_index INTEGER NOT NULL,
  parent_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  contextual_content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  token_count INTEGER,
  content_hash TEXT,
  page_number INTEGER,
  section_path TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT memory_source_chunks_source_index_unique UNIQUE (source_id, chunk_index)
);

ALTER TABLE memory_source_chunks
  ADD COLUMN IF NOT EXISTS memory_source_chunks_content_tsv tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(contextual_content, '') || ' ' || coalesce(content, ''))
    ) STORED;

CREATE TABLE IF NOT EXISTS memory_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES memory_sources(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES memory_source_chunks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  workspace_id UUID,
  scope TEXT,
  quote TEXT,
  confidence REAL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT memory_evidence_memory_chunk_unique UNIQUE (memory_id, chunk_id)
);

CREATE INDEX IF NOT EXISTS memories_workspace_scope_type_current_idx
  ON memories (workspace_id, scope, memory_type)
  WHERE is_current = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS memory_sources_workspace_status_idx
  ON memory_sources (workspace_id, status);

CREATE INDEX IF NOT EXISTS memory_sources_content_hash_idx
  ON memory_sources (workspace_id, content_hash);

CREATE INDEX IF NOT EXISTS memory_relations_workspace_scope_idx
  ON memory_relations (workspace_id, scope);

CREATE INDEX IF NOT EXISTS workspaces_created_by_idx
  ON workspaces (created_by_user_id);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx
  ON workspace_members (user_id);

CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx
  ON workspace_members (workspace_id);

CREATE INDEX IF NOT EXISTS workspace_invitations_workspace_idx
  ON workspace_invitations (workspace_id);

CREATE INDEX IF NOT EXISTS workspace_invitations_email_idx
  ON workspace_invitations (email);

CREATE INDEX IF NOT EXISTS workspace_invitations_token_hash_idx
  ON workspace_invitations (token_hash);

CREATE INDEX IF NOT EXISTS memory_source_chunks_embedding_idx
  ON memory_source_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS memory_source_chunks_user_scope_idx
  ON memory_source_chunks (user_id, scope, project);

CREATE INDEX IF NOT EXISTS memory_source_chunks_workspace_scope_idx
  ON memory_source_chunks (workspace_id, scope, project);

CREATE INDEX IF NOT EXISTS memory_source_chunks_source_idx
  ON memory_source_chunks (source_id);

CREATE INDEX IF NOT EXISTS memory_source_chunks_content_tsv_idx
  ON memory_source_chunks USING gin (memory_source_chunks_content_tsv);

CREATE INDEX IF NOT EXISTS memory_evidence_memory_idx
  ON memory_evidence (memory_id);

CREATE INDEX IF NOT EXISTS memory_evidence_chunk_idx
  ON memory_evidence (chunk_id);

CREATE INDEX IF NOT EXISTS memory_evidence_source_idx
  ON memory_evidence (source_id);

CREATE INDEX IF NOT EXISTS memory_evidence_workspace_scope_idx
  ON memory_evidence (workspace_id, scope);
