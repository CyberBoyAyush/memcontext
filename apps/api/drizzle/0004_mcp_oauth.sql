CREATE TABLE IF NOT EXISTS oauth_application (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  metadata TEXT,
  client_id TEXT NOT NULL UNIQUE,
  client_secret TEXT,
  redirect_urls TEXT NOT NULL,
  type TEXT NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS oauth_application_user_id_idx
  ON oauth_application (user_id);

CREATE TABLE IF NOT EXISTS oauth_access_token (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL UNIQUE,
  refresh_token TEXT NOT NULL UNIQUE,
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  client_id TEXT NOT NULL REFERENCES oauth_application(client_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  scopes TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS oauth_access_token_client_id_idx
  ON oauth_access_token (client_id);

CREATE INDEX IF NOT EXISTS oauth_access_token_user_id_idx
  ON oauth_access_token (user_id);

CREATE TABLE IF NOT EXISTS oauth_consent (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_application(client_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  scopes TEXT NOT NULL,
  consent_given BOOLEAN NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS oauth_consent_client_id_idx
  ON oauth_consent (client_id);

CREATE INDEX IF NOT EXISTS oauth_consent_user_id_idx
  ON oauth_consent (user_id);
