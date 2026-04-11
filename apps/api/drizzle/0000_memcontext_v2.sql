ALTER TABLE memories ADD COLUMN valid_from TIMESTAMP;
ALTER TABLE memories ADD COLUMN valid_until TIMESTAMP;

ALTER TABLE memories ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

CREATE INDEX memories_content_tsv_idx ON memories USING gin (content_tsv);
CREATE INDEX memories_valid_until_idx ON memories (valid_until);

CREATE TYPE memory_feedback_type AS ENUM ('helpful', 'not_helpful', 'outdated', 'wrong');

CREATE TABLE memory_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id),
  user_id TEXT NOT NULL,
  type memory_feedback_type NOT NULL,
  context TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX memory_feedback_memory_idx ON memory_feedback (memory_id);
CREATE INDEX memory_feedback_user_idx ON memory_feedback (user_id);
