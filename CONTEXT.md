# MemContext - Project Context

## What We're Building

Centralized memory system for AI coding agents. Stores user preferences, project context, and decisions as searchable memories. AI assistants (Claude Desktop, Cursor, Cline) retrieve relevant context automatically via semantic search.

**Domain:** memcontext.in

**Problem:** AI agents forget everything between sessions. Users repeat themselves constantly.

**Solution:** Persistent memory layer accessible via MCP protocol. Save once, retrieve forever.

---

## Architecture

```
Claude Desktop / Cursor / Cline
              │
              │ MCP (stdio)
              ▼
         apps/mcp (thin wrapper, no business logic)
              │
              │ HTTP + X-API-Key
              ▼
         apps/api (Hono - ALL business logic)
              │
              ▼
    ┌─────────┴─────────┐
    │                   │
Upstash Redis      Neon Postgres
(API key cache)    (memories + pgvector)
```

**Key Principle:** apps/api is the single source of truth. MCP and future web dashboard are thin clients.

---

## Tech Stack

| Component             | Package                     | Version |
| --------------------- | --------------------------- | ------- |
| Monorepo              | turborepo + pnpm            | latest  |
| API Framework         | hono                        | 4.11.3  |
| API Server            | @hono/node-server           | 1.19.7  |
| Validation            | zod                         | 4.2.1   |
| Zod Middleware        | @hono/zod-validator         | 0.7.6   |
| ORM                   | drizzle-orm                 | 0.45.1  |
| Migrations            | drizzle-kit                 | 0.31.8  |
| Database Driver       | pg                          | 8.16.3  |
| MCP SDK               | @modelcontextprotocol/sdk   | 1.25.1  |
| Cache                 | @upstash/redis              | 1.36.0  |
| Auth                  | better-auth                 | 1.4.9   |
| AI (Embeddings + LLM) | @openrouter/ai-sdk-provider | 1.5.4   |

**Database:** PostgreSQL with pgvector extension (hosted on Neon Singapore)

**AI Provider:** OpenRouter for both embeddings (text-embedding-3-large) and LLM classification (gemini-2.5-flash)

---

## Repository Structure

```
memcontext/
├── apps/
│   ├── api/                 # Hono backend (all business logic)
│   │   ├── src/
│   │   │   ├── db/          # schema.ts, connection
│   │   │   ├── routes/      # memories.ts, api-keys.ts
│   │   │   ├── services/    # embedding.ts, memory.ts, relation.ts
│   │   │   ├── middleware/  # auth.ts
│   │   │   ├── utils/       # hash.ts, normalize.ts
│   │   │   └── index.ts
│   │   └── drizzle.config.ts
│   └── mcp/                 # MCP server (thin wrapper)
│       └── src/
│           ├── tools/       # save-memory.ts, search-memory.ts
│           ├── lib/         # api-client.ts
│           └── index.ts
├── packages/
│   └── types/               # Shared TypeScript types
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Database Schema (Custom Tables Only)

Better Auth auto-generates its own tables (user, session, account, verification) when web dashboard is added. Below are our custom tables.

### subscriptions

| Column       | Type      | Constraints              | Description                               |
| ------------ | --------- | ------------------------ | ----------------------------------------- |
| id           | UUID      | PK, default random       |                                           |
| user_id      | TEXT      | NOT NULL, UNIQUE         | Owner (FK -> user when Better Auth added) |
| plan         | TEXT      | NOT NULL, default 'free' | free / hobby / pro                        |
| memory_count | INTEGER   | NOT NULL, default 0      | Current non-deleted memories              |
| memory_limit | INTEGER   | NOT NULL, default 5000   | Based on plan                             |
| created_at   | TIMESTAMP | NOT NULL, default now    |                                           |
| updated_at   | TIMESTAMP | NOT NULL, default now    |                                           |

**Plan Limits:**

| Plan  | Limit  | Price     |
| ----- | ------ | --------- |
| free  | 300    | $0/month  |
| hobby | 2,000  | $5/month  |
| pro   | 10,000 | $15/month |

### api_keys

| Column       | Type      | Constraints           | Description                    |
| ------------ | --------- | --------------------- | ------------------------------ |
| id           | UUID      | PK, default random    |                                |
| user_id      | TEXT      | NOT NULL, FK -> user  | Owner                          |
| key_prefix   | TEXT      | NOT NULL              | Display prefix "mc_a1b2c3"     |
| key_hash     | TEXT      | NOT NULL, UNIQUE      | SHA-256 hash (never store raw) |
| name         | TEXT      | NOT NULL              | User label "Claude Desktop"    |
| last_used_at | TIMESTAMP |                       | Updated on each request        |
| created_at   | TIMESTAMP | NOT NULL, default now |                                |

### memories

| Column        | Type         | Constraints            | Description                            |
| ------------- | ------------ | ---------------------- | -------------------------------------- |
| id            | UUID         | PK, default random     |                                        |
| user_id       | TEXT         | NOT NULL, FK -> user   | Owner                                  |
| content       | TEXT         | NOT NULL               | Clean, atomic fact                     |
| embedding     | VECTOR(1536) | NOT NULL               | From text-embedding-3-large            |
| category      | TEXT         |                        | preference / fact / decision / context |
| project       | TEXT         |                        | Normalized: lowercase, no spaces       |
| source        | TEXT         | NOT NULL               | mcp / web / api                        |
| is_current    | BOOLEAN      | NOT NULL, default true | False when superseded                  |
| supersedes_id | UUID         | FK -> memories         | Previous version this replaces         |
| root_id       | UUID         | FK -> memories         | Original memory in chain               |
| version       | INTEGER      | NOT NULL, default 1    | Increments on update                   |
| deleted_at    | TIMESTAMP    |                        | Soft delete                            |
| created_at    | TIMESTAMP    | NOT NULL, default now  |                                        |

### memory_relations

| Column        | Type      | Constraints              | Description          |
| ------------- | --------- | ------------------------ | -------------------- |
| id            | UUID      | PK, default random       |                      |
| source_id     | UUID      | NOT NULL, FK -> memories |                      |
| target_id     | UUID      | NOT NULL, FK -> memories |                      |
| relation_type | TEXT      | NOT NULL                 | extends / similar    |
| strength      | REAL      |                          | Similarity score 0-1 |
| created_at    | TIMESTAMP | NOT NULL, default now    |                      |

### Indexes

- subscriptions.user_id already UNIQUE (implicit index)
- HNSW on memories.embedding with vector_cosine_ops (fast similarity search)
- Composite on memories(user_id, is_current, deleted_at) (filtered queries)
- Index on memories.supersedes_id and memories.root_id (version traversal)
- Index on api_keys.key_hash (already UNIQUE, implicit index)

---

## Authentication

| Client        | Method              | Header             |
| ------------- | ------------------- | ------------------ |
| MCP Server    | API Key             | X-API-Key: mc\_... |
| Web Dashboard | Better Auth Session | Cookie             |

Both resolve to the same user. API middleware checks X-API-Key first, falls back to session.

**API Key Format:**

- Full key: `mc_` + 32 random characters (shown once at creation)
- Prefix: `mc_` + first 8 characters (stored for display)
- Storage: SHA-256 hash only

**Caching:** API key validation + subscription data cached in Upstash Redis with 7-day TTL, refreshed on use via GETEX. Cache stores: user_id, plan, memory_count, memory_limit.

**Cache Invalidation:**

- API key revoked: delete cache entry
- Subscription updated: delete cache entry (will refresh on next request)

---

## Relationship Detection (LLM Layer)

When a new memory has similarity > 0.70 to an existing memory, we compare against top-5 similar memories and classify:

| Type    | Condition                       | Action                                                     |
| ------- | ------------------------------- | ---------------------------------------------------------- |
| UPDATE  | New contradicts/replaces old    | Old: is_current=false, New: supersedes_id=old.id           |
| EXTEND  | New adds detail to old          | Both stay current, add to memory_relations (type: extends) |
| SIMILAR | Related but separate facts      | Both stay current, add to memory_relations (type: similar) |
| NOOP    | New already covered by existing | Skip save, return existing memory ID                       |

**LLM Call:** OpenRouter with gemini-2.5-flash, JSON Schema response format.

**Fallback:** Default to SIMILAR if LLM fails (keeps both, safe option).

**Performance:** ~80% of saves have no similar match (0ms overhead). ~20% trigger LLM (~200-400ms).

---

## Similarity Math (pgvector)

pgvector uses cosine distance, not similarity:

```
similarity = 1 - distance
distance < 0.30 = similarity > 0.70 (LLM classification threshold for saves)
distance < 0.50 = similarity > 0.50 (search result threshold)
```

Use Drizzle's cosineDistance helper with lt() for threshold checks.

---

## Search Flow (Multi-Query)

Search uses multi-query approach for better recall:

```
User Query: "authentication preferences"
        |
        v
[1] Generate 3 query variants using LLM (parallel with step 2)
[2] Create embedding for original query
        |
        v
[3] Search with original embedding (parallel with step 4)
[4] Create embeddings for 3 variants
        |
        v
[5] Search with all 3 variant embeddings (parallel)
        |
        v
[6] Merge results, dedupe by ID, keep highest score per memory
        |
        v
[7] Return top N results sorted by relevance
```

This approach catches memories stored with different wording than the query.

---

## MCP Tools

### save_memory

**Input:** content (required), category (optional), project (optional)

**Behavior:**

1. Check subscription: memory_count < memory_limit (reject with LIMIT_EXCEEDED if over)
2. Generate embedding via OpenRouter
3. Search for similar memories (distance < 0.20, is_current = true)
4. If match found, classify via LLM (update/extend/similar)
5. Insert accordingly, update relations/versions
6. Increment subscription.memory_count (+1 for all inserts)

**Output:** { id, status: "saved" | "updated" | "extended" | "duplicate", superseded?, existingId? }

### search_memory

**Input:** query (required), limit (default 5, max 10), category (optional), project (optional)

**Behavior:**

1. Expand query via LLM (adds keywords and context for better matching)
2. Generate query embedding
3. Vector search with filters (user_id, is_current=true, deleted_at=null)
4. Return top results above 0.60 similarity

**Output:** { found, memories: [{ id, content, category, relevance, created }] }

**Project Normalization:** Both tools normalize project names to lowercase with no spaces/special characters.

---

## Environment Variables

```
DATABASE_URL=postgres://...@....neon.tech/...?sslmode=require
OPENROUTER_API_KEY=sk-or-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
```

---

## Coding Standards

**Naming:**

- Files: kebab-case (save-memory.ts, api-client.ts)
- Functions/Variables: camelCase
- Types/Interfaces: PascalCase
- Constants: SCREAMING_SNAKE_CASE

**Error Handling:**

- Use Hono's HTTPException for API errors
- Return consistent error shape: { error: string, code?: string }
- Log errors with context (userId, action, input)

**Validation:**

- Zod schemas for all inputs
- Use @hono/zod-validator middleware
- Fail fast with descriptive messages

**Database:**

- All queries through Drizzle (no raw SQL except migrations)
- Use transactions for multi-table operations
- Soft delete by default (set deleted_at, never hard delete)

**Security:**

- Never log API keys or embeddings
- Hash API keys with SHA-256
- Validate user ownership on all memory operations
- Rate limit API endpoints

**Testing:**

- Unit tests for services
- Integration tests for routes
- Use MCP Inspector for MCP testing
