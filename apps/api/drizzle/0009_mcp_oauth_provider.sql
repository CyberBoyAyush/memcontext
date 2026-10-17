-- Better Auth 1.7 OAuth provider (@better-auth/mcp + jwt + cimd) for MCP 2026-07-28.
-- The deprecated better-auth `mcp` plugin tables are kept as legacy_* for rollback;
-- their opaque tokens are not accepted by the new provider (one-time reconnect).

DO $$ BEGIN
  IF to_regclass('public.oauth_access_token') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'oauth_access_token' AND column_name = 'access_token') THEN
    ALTER TABLE oauth_access_token RENAME TO legacy_oauth_access_token;
    ALTER INDEX IF EXISTS oauth_access_token_pkey RENAME TO legacy_oauth_access_token_pkey;
    ALTER INDEX IF EXISTS oauth_access_token_access_token_key RENAME TO legacy_oauth_access_token_access_token_key;
    ALTER INDEX IF EXISTS oauth_access_token_refresh_token_key RENAME TO legacy_oauth_access_token_refresh_token_key;
    ALTER INDEX IF EXISTS oauth_access_token_client_id_idx RENAME TO legacy_oauth_access_token_client_id_idx;
    ALTER INDEX IF EXISTS oauth_access_token_user_id_idx RENAME TO legacy_oauth_access_token_user_id_idx;
  END IF;
  IF to_regclass('public.oauth_consent') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'oauth_consent' AND column_name = 'consent_given') THEN
    ALTER TABLE oauth_consent RENAME TO legacy_oauth_consent;
    ALTER INDEX IF EXISTS oauth_consent_pkey RENAME TO legacy_oauth_consent_pkey;
    ALTER INDEX IF EXISTS oauth_consent_client_id_idx RENAME TO legacy_oauth_consent_client_id_idx;
    ALTER INDEX IF EXISTS oauth_consent_user_id_idx RENAME TO legacy_oauth_consent_user_id_idx;
  END IF;
  IF to_regclass('public.oauth_application') IS NOT NULL THEN
    ALTER TABLE oauth_application RENAME TO legacy_oauth_application;
    ALTER INDEX IF EXISTS oauth_application_pkey RENAME TO legacy_oauth_application_pkey;
    ALTER INDEX IF EXISTS oauth_application_client_id_key RENAME TO legacy_oauth_application_client_id_key;
    ALTER INDEX IF EXISTS oauth_application_user_id_idx RENAME TO legacy_oauth_application_user_id_idx;
  END IF;
END $$;

-- Added by @dodopayments/better-auth >= 1.6 as an additional user field.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "dodo_customer_id" text;

-- Grants bind to the workspace selected on the consent page (see 0008).
CREATE TABLE IF NOT EXISTS mcp_workspace_selections (
  user_id TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mcp_workspace_selections_workspace_idx ON mcp_workspace_selections (workspace_id);

CREATE TABLE IF NOT EXISTS "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"expires_at" timestamp,
	"alg" text,
	"crv" text
);

CREATE TABLE IF NOT EXISTS "oauth_access_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"refresh_id" text,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"revoked" timestamp,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL,
	CONSTRAINT "oauth_access_token_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "oauth_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"client_discovery_id" text,
	"disabled" boolean DEFAULT false,
	"skip_consent" boolean,
	"enable_end_session" boolean,
	"subject_type" text,
	"scopes" text[],
	"client_credentials_scopes" text[] DEFAULT '{}',
	"user_id" text,
	"created_at" timestamp,
	"updated_at" timestamp,
	"name" text,
	"uri" text,
	"icon" text,
	"contacts" text[],
	"tos" text,
	"policy" text,
	"software_id" text,
	"software_version" text,
	"software_statement" text,
	"redirect_uris" text[] NOT NULL,
	"post_logout_redirect_uris" text[],
	"backchannel_logout_uri" text,
	"backchannel_logout_session_required" boolean,
	"token_endpoint_auth_method" text,
	"application_type" text,
	"jwks" text,
	"jwks_uri" text,
	"grant_types" text[],
	"response_types" text[],
	"require_pkce" boolean,
	"dpop_bound_access_tokens" boolean DEFAULT false,
	"reference_id" text,
	"metadata" jsonb,
	CONSTRAINT "oauth_client_client_id_unique" UNIQUE("client_id")
);

CREATE TABLE IF NOT EXISTS "oauth_client_assertion" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauth_client_resource" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"resource_id" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp
);

CREATE TABLE IF NOT EXISTS "oauth_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text,
	"reference_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"scopes" text[] NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauth_refresh_token" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"client_id" text NOT NULL,
	"session_id" text,
	"user_id" text NOT NULL,
	"reference_id" text,
	"authorization_code_id" text,
	"resources" text[],
	"requested_user_info_claims" text[],
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"revoked" timestamp,
	"rotated_at" timestamp,
	"rotation_replay_response" text,
	"rotation_replay_expires_at" timestamp,
	"auth_time" timestamp,
	"confirmation" jsonb,
	"scopes" text[] NOT NULL,
	CONSTRAINT "oauth_refresh_token_token_unique" UNIQUE("token")
);

CREATE TABLE IF NOT EXISTS "oauth_resource" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"name" text NOT NULL,
	"access_token_ttl" integer,
	"refresh_token_ttl" integer,
	"signing_algorithm" text,
	"signing_key_id" text,
	"allowed_scopes" text[],
	"custom_claims" jsonb,
	"dpop_bound_access_tokens_required" boolean DEFAULT false,
	"disabled" boolean DEFAULT false,
	"created_at" timestamp,
	"updated_at" timestamp,
	"policy_version" integer DEFAULT 1,
	"metadata" jsonb,
	CONSTRAINT "oauth_resource_identifier_unique" UNIQUE("identifier")
);

DO $$ BEGIN
  ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_access_token" ADD CONSTRAINT "oauth_access_token_refresh_id_oauth_refresh_token_id_fk" FOREIGN KEY ("refresh_id") REFERENCES "public"."oauth_refresh_token"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_client" ADD CONSTRAINT "oauth_client_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_client_resource" ADD CONSTRAINT "oauth_client_resource_resource_id_oauth_resource_identifier_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."oauth_resource"("identifier") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_consent" ADD CONSTRAINT "oauth_consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "oauthAccessToken_clientId_idx" ON "oauth_access_token" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_sessionId_idx" ON "oauth_access_token" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_userId_idx" ON "oauth_access_token" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_authorizationCodeId_idx" ON "oauth_access_token" USING btree ("authorization_code_id");
CREATE INDEX IF NOT EXISTS "oauthAccessToken_refreshId_idx" ON "oauth_access_token" USING btree ("refresh_id");
CREATE INDEX IF NOT EXISTS "oauthClient_userId_idx" ON "oauth_client" USING btree ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "oauthClientResource_clientId_resourceId_uidx" ON "oauth_client_resource" USING btree ("client_id","resource_id");
CREATE INDEX IF NOT EXISTS "oauthClientResource_clientId_idx" ON "oauth_client_resource" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "oauthClientResource_resourceId_idx" ON "oauth_client_resource" USING btree ("resource_id");
CREATE INDEX IF NOT EXISTS "oauthConsent_clientId_idx" ON "oauth_consent" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "oauthConsent_userId_idx" ON "oauth_consent" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_clientId_idx" ON "oauth_refresh_token" USING btree ("client_id");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_sessionId_idx" ON "oauth_refresh_token" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_userId_idx" ON "oauth_refresh_token" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "oauthRefreshToken_authorizationCodeId_idx" ON "oauth_refresh_token" USING btree ("authorization_code_id");
