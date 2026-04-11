# MemContext API

The backend service for MemContext. Handles all business logic, database operations, memory processing, and AI integrations.

## Overview

This is the core of MemContext. All other clients (MCP server, future web dashboard) are thin wrappers that call this API. The API is responsible for:

- Storing and retrieving memories
- Generating vector embeddings for semantic search
- Processing memory relationships using LLM
- Managing API keys and subscriptions
- Enforcing rate limits and plan quotas

## Architecture

```
Request
   |
   v
Middleware (auth, rate-limit, logging)
   |
   v
Routes (/api/memories, /api/api-keys)
   |
   v
Services (memory, embedding, relation, subscription)
   |
   v
Database (Drizzle ORM)
   |
   +---> PostgreSQL (pgvector)
   +---> Redis (caching)
```

## API Endpoints

### Memories (API Key or Session auth)

| Method | Path                       | Description                   |
| ------ | -------------------------- | ----------------------------- |
| POST   | /api/memories              | Save a memory                 |
| GET    | /api/memories/search       | Hybrid search memories        |
| GET    | /api/memories/profile      | Pre-aggregated user context   |
| GET    | /api/memories              | List memories (paginated)     |
| GET    | /api/memories/:id          | Get a single memory           |
| GET    | /api/memories/:id/history  | Get memory version history    |
| PATCH  | /api/memories/:id          | Update a memory               |
| DELETE | /api/memories/:id          | Delete a memory               |
| POST   | /api/memories/:id/forget   | Soft-delete (forget) a memory |
| POST   | /api/memories/:id/feedback | Submit feedback on a memory   |

### API Keys

| Method | Path              | Auth | Description       |
| ------ | ----------------- | ---- | ----------------- |
| POST   | /api/api-keys     | None | Create an API key |
| GET    | /api/api-keys     | None | List all API keys |
| DELETE | /api/api-keys/:id | None | Revoke an API key |

### Health

| Method | Path    | Auth | Description  |
| ------ | ------- | ---- | ------------ |
| GET    | /health | None | Health check |

## Authentication

API endpoints are protected using the `X-API-Key` header. Keys are generated with a `mc_` prefix and stored as SHA-256 hashes. Valid keys are cached in Redis with a 7-day TTL.

## Database Schema

### memories

Stores all user memories with vector embeddings.

| Field         | Description                             |
| ------------- | --------------------------------------- |
| id            | Unique identifier                       |
| user_id       | Owner of the memory                     |
| content       | The memory text                         |
| embedding     | 1536-dimension vector                   |
| category      | preference, fact, decision, or context  |
| project       | Optional project name                   |
| source        | mcp, web, or api                        |
| is_current    | Whether this is the latest version      |
| supersedes_id | ID of memory this replaces              |
| version       | Version number                          |
| valid_from    | When this memory became true            |
| valid_until   | When this memory expires (null=forever) |
| content_tsv   | Auto-generated tsvector for FTS         |

### memory_relations

Tracks relationships between memories.

| Field         | Description        |
| ------------- | ------------------ |
| source_id     | The new memory     |
| target_id     | The related memory |
| relation_type | extends or similar |
| strength      | Similarity score   |

### api_keys

Stores hashed API keys.

| Field      | Description         |
| ---------- | ------------------- |
| user_id    | Owner               |
| key_hash   | SHA-256 hash        |
| key_prefix | Display prefix      |
| name       | User-provided label |

### subscriptions

Tracks user plans and memory usage.

| Field        | Description         |
| ------------ | ------------------- |
| user_id      | Owner               |
| plan         | free, hobby, or pro |
| memory_count | Current count       |
| memory_limit | Based on plan       |

**Plan Limits:**

| Plan  | Limit  |
| ----- | ------ |
| free  | 300    |
| hobby | 2,000  |
| pro   | 10,000 |

### memory_feedback

| Field     | Description                              |
| --------- | ---------------------------------------- |
| memory_id | Memory being rated                       |
| user_id   | Who submitted the feedback               |
| type      | helpful, not_helpful, outdated, or wrong |
| context   | Optional context                         |

## Memory Processing

When a memory is saved:

1. Check if user is within their plan limit
2. Expand the memory text using LLM for better searchability
3. Generate vector embedding using text-embedding-3-large
4. Search for similar existing memories (cosine similarity above 0.70, not expired)
5. If similar found, classify relationship using LLM (update, extend, or similar)
6. Store memory with appropriate relations and temporal metadata

When searching:

1. Generate 3 query variants via LLM
2. Run vector search + full-text search in parallel
3. Merge results via Reciprocal Rank Fusion (RRF)
4. Exclude expired memories (validUntil < now)
5. Return top K with normalized relevance scores

## Environment Variables

| Variable                 | Required | Description                                |
| ------------------------ | -------- | ------------------------------------------ |
| DATABASE_URL             | Yes      | PostgreSQL connection string with pgvector |
| OPENROUTER_API_KEY       | Yes      | For embeddings and LLM calls               |
| UPSTASH_REDIS_REST_URL   | Yes      | Redis for caching                          |
| UPSTASH_REDIS_REST_TOKEN | Yes      | Redis auth token                           |
| PORT                     | No       | Server port (default: 3000)                |
| NODE_ENV                 | No       | dev, production, or test                   |
| LOG_LEVEL                | No       | Logging verbosity                          |
| LOGTAIL_SOURCE_TOKEN     | No       | Better Stack logging                       |
| LOGTAIL_INGEST_ENDPOINT  | No       | Better Stack endpoint                      |

## Development

Run the development server:

```
pnpm dev
```

The API will be available at http://localhost:3000.

## Dependencies

| Package        | Purpose           |
| -------------- | ----------------- |
| hono           | Web framework     |
| drizzle-orm    | Database ORM      |
| pg             | PostgreSQL driver |
| @upstash/redis | Redis client      |
| zod            | Validation        |
| pino           | Logging           |
| ai             | AI SDK            |
