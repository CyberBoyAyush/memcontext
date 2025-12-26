# MemContext - Implementation Plan

## Overview

This plan covers implementing the Hono API backend (apps/api) and MCP server (apps/mcp). The web dashboard is deferred to a later phase.

The goal is a working end-to-end flow: Claude Desktop saves a memory via MCP, it gets stored in Postgres with embeddings, and can be retrieved via semantic search.

---

## Phase 1: Project Foundation

Set up the monorepo structure and configure all packages with their dependencies.

**apps/api dependencies:**
- hono, @hono/node-server, @hono/zod-validator
- drizzle-orm, drizzle-kit, pg
- @upstash/redis
- @openrouter/ai-sdk-provider
- better-auth
- zod
- typescript, @types/node, @types/pg, tsx (dev)

**apps/mcp dependencies:**
- @modelcontextprotocol/sdk
- zod
- typescript, @types/node, tsx (dev)

**packages/types dependencies:**
- typescript (dev only, exports shared types)

Configure tsconfig.json for each package with proper path aliases and module resolution. Set up turbo.json with build pipeline that respects package dependencies.

Create .env.example at root with all required environment variables documented.

---

## Phase 2: Shared Types

Define TypeScript types in packages/types that both apps/api and apps/mcp will use.

**Memory types:** Memory interface matching database schema, SaveMemoryRequest/Response, SearchMemoryRequest/Response

**API types:** ApiKey interface, ApiError shape, ApiResponse wrapper

**Enum types:** MemoryCategory (preference/fact/decision/context), RelationType (extends/similar), MemorySource (mcp/web/api)

Export everything from a single index.ts entry point. Configure package.json exports field properly so other packages can import via @memcontext/types.

---

## Phase 3: Database Layer

Set up Drizzle ORM with PostgreSQL connection and define the schema.

**Connection setup:** Create db/index.ts with pg Pool connection using DATABASE_URL. Export the Drizzle instance configured with the schema.

**Schema definition:** Create db/schema.ts with three tables:
- api_keys: id, user_id, key_prefix, key_hash, name, last_used_at, created_at
- memories: id, user_id, content, embedding (vector 1536), category, project, source, is_current, supersedes_id, root_id, version, deleted_at, created_at
- memory_relations: id, source_id, target_id, relation_type, strength, created_at

Define all indexes including the HNSW index on the embedding column for fast vector search.

**drizzle.config.ts:** Configure for PostgreSQL with the schema path and migration output directory.

Run migrations against the Neon database. Ensure pgvector extension is enabled first with CREATE EXTENSION IF NOT EXISTS vector.

---

## Phase 4: Utility Functions

Create small, focused utility modules in src/utils/.

**hash.ts:** Function to hash API keys using SHA-256. Takes raw key string, returns hex hash. Used for both storing and validating keys.

**normalize.ts:** Function to normalize project names. Converts to lowercase, removes spaces/hyphens/underscores/special characters. Returns undefined if input is empty.

**id.ts:** Function to generate prefixed IDs if needed (e.g., mem_xxx for memories, mc_xxx for API keys). Use crypto.randomUUID() or similar.

---

## Phase 5: External Service Clients

Set up clients for external services in src/lib/.

**openrouter.ts:** Initialize OpenRouter client with the AI SDK provider. Export functions for:
- Generating embeddings using text-embedding-3-large with 1536 dimensions
- Calling LLM for relationship classification using gemini-2.0-flash-lite with JSON Schema response format

**redis.ts:** Initialize Upstash Redis client from environment variables. Export the client instance for use in caching layer.

---

## Phase 6: Service Layer

Implement business logic in src/services/. Each service is a module with pure functions that take dependencies explicitly.

**cache.ts:** 
- getCachedApiKey: Check Redis for cached user data by key hash, use GETEX to refresh TTL on hit
- cacheApiKey: Store user data in Redis with 7-day TTL
- invalidateApiKey: Delete cached entry when key is revoked

**embedding.ts:**
- generateEmbedding: Take text content, call OpenRouter embeddings API, return 1536-dimension float array
- Handle errors gracefully, throw descriptive errors for upstream handling

**relation.ts:**
- classifyRelationship: Take old memory content and new memory content, call OpenRouter LLM with JSON Schema forcing enum response
- Parse response, return "update" | "extend" | "similar"
- Default to "similar" on any parsing failure (safe fallback)

**memory.ts:**
- saveMemory: Orchestrate the full save flow
  1. Generate embedding for new content
  2. Search for similar existing memories (distance < 0.20, is_current = true, same user)
  3. If no match, insert new memory as-is
  4. If match found, call classifyRelationship
  5. Based on classification:
     - UPDATE: Set old memory is_current=false, insert new with supersedes_id pointing to old, copy root_id, increment version
     - EXTEND: Insert new memory, add memory_relation with type=extends
     - SIMILAR: Insert new memory, add memory_relation with type=similar
  6. Return result with id, status, and superseded id if applicable

- searchMemories: Execute semantic search
  1. Generate embedding for query
  2. Query memories table with filters (user_id, is_current=true, deleted_at=null, optional category/project)
  3. Order by cosine distance ascending
  4. Apply limit
  5. Calculate relevance as (1 - distance)
  6. Return memories with relevance scores

- findSimilarMemory: Helper used by saveMemory to find potential matches before classification

---

## Phase 7: Authentication Middleware

Create auth middleware in src/middleware/auth.ts.

The middleware checks for authentication in order:
1. Look for X-API-Key header
2. If present, hash the key and check cache
3. On cache miss, query database for matching key_hash
4. If valid, cache the result and update last_used_at
5. If no API key, fall back to Better Auth session check (for future web dashboard)
6. Set userId in Hono context for downstream handlers
7. Return 401 if neither auth method succeeds

Create a typed context that includes userId so route handlers can access it safely.

---

## Phase 8: API Routes

Implement HTTP routes in src/routes/.

**memories.ts:**

POST / (save memory)
- Apply auth middleware
- Validate request body with Zod schema (content required, category/project optional)
- Call memory service saveMemory
- Return JSON response with id, status, superseded

GET /search (search memories)
- Apply auth middleware
- Validate query params with Zod (query required, limit/category/project optional)
- Call memory service searchMemories
- Return JSON response with found count and memories array

**api-keys.ts:**

POST / (create API key)
- Apply auth middleware (session only, not API key)
- Validate request body (name required)
- Generate new API key with mc_ prefix
- Hash the key, store hash and prefix in database
- Return full key (only time it's shown) and key metadata

GET / (list API keys)
- Apply auth middleware (session only)
- Query all keys for user
- Return array with id, name, prefix, last_used_at, created_at (never return hash)

DELETE /:id (revoke API key)
- Apply auth middleware (session only)
- Verify key belongs to user
- Delete from database
- Invalidate cache
- Return success

---

## Phase 9: API Entry Point

Create src/index.ts as the Hono app entry point.

- Create Hono app instance
- Mount route modules under /api prefix
  - /api/memories -> memories routes
  - /api/api-keys -> api-keys routes
- Add global error handler that catches HTTPException and returns consistent error shape
- Add request logging middleware (method, path, duration, status)
- Set up CORS if needed for development
- Export app for @hono/node-server

Create server.ts or modify index.ts to actually start the HTTP server using @hono/node-server serve function with configurable port.

---

## Phase 10: MCP Server Foundation

Set up the MCP server in apps/mcp.

**lib/api-client.ts:**
- Read API base URL and API key from environment
- Export get() and post() functions that:
  - Prepend base URL to paths
  - Add X-API-Key header
  - Handle JSON serialization/deserialization
  - Throw errors with message from API response on non-2xx

---

## Phase 11: MCP Tools

Implement MCP tools in src/tools/.

**save-memory.ts:**
- Define Zod schema for input (content required, category enum optional, project string optional)
- Tool description includes project naming rules in the description itself (lowercase, no spaces)
- Handler normalizes project, calls API client post to /api/memories
- Returns tool result with stringified JSON response

**search-memory.ts:**
- Define Zod schema for input (query required, limit number optional with max 10, category/project optional)
- Handler builds query params, calls API client get to /api/memories/search
- Returns tool result with stringified JSON response

Both tools catch errors and return isError: true with error message for MCP error handling.

---

## Phase 12: MCP Entry Point

Create src/index.ts for the MCP server.

- Import McpServer from SDK
- Create server instance with name "memcontext" and version
- Register both tools using server.tool() with schema and handler
- Create StdioServerTransport
- Connect server to transport
- Handle process signals for graceful shutdown

The server runs as a long-lived process communicating via stdio with Claude Desktop or other MCP clients.

---

## Phase 13: Integration Testing

Test the complete flow end-to-end.

**API testing:**
- Use curl or httpie to test endpoints directly
- Create an API key via the API (need to bootstrap a user first via Better Auth)
- Save a memory, verify it returns correctly
- Save a similar memory, verify relationship detection works
- Search memories, verify results

**MCP testing:**
- Use MCP Inspector tool: npx @modelcontextprotocol/inspector
- Connect to the MCP server
- Call save_memory tool, verify response
- Call search_memory tool, verify results
- Test error cases (invalid API key, missing required fields)

**Full flow:**
- Configure Claude Desktop with the MCP server
- In Claude, tell it a preference
- Verify it gets saved (check database or API)
- In a new conversation, ask Claude something related
- Verify it retrieves the memory

---

## Phase 14: Production Hardening

Prepare for deployment.

**Environment validation:** On startup, validate all required environment variables are present. Fail fast with clear error message if not.

**Logging:** Add structured logging (consider pino or similar). Log all errors with stack traces, log important operations (memory saved, search performed) at info level.

**Rate limiting:** Add rate limiting middleware to API routes. Consider per-user limits for save (prevent abuse) and search (prevent cost overruns).

**Health checks:** Add GET /health endpoint that checks database connectivity and returns 200 if healthy.

**Error handling:** Ensure no stack traces leak to clients. All errors return consistent JSON shape.

**Graceful shutdown:** Handle SIGTERM/SIGINT, close database connections cleanly.

---

## Deployment Notes

**apps/api:** Deploy to Railway or similar. Set environment variables. Runs as standard Node.js HTTP server.

**apps/mcp:** Distributed to users to run locally. Published to npm or distributed as binary. Users configure Claude Desktop to run it with their API key.

**Database:** Neon handles scaling. Enable connection pooling (use pooler endpoint in connection string).

**Monitoring:** Add Better Stack or similar for uptime monitoring of API endpoints. Log aggregation for debugging.