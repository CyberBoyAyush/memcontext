# MemContext API

The backend service for MemContext. Handles all business logic, database operations, memory processing, and AI integrations.

## Overview

This is the core of MemContext. MCP, dashboard, website, and SDK clients call this API. The API is responsible for:

- Storing and retrieving memories
- Ingesting workspace documents into Context Vault
- Generating vector embeddings for semantic search
- Processing memory relationships using LLM
- Managing API keys, subscriptions, waitlist, and admin views
- Enforcing rate limits and plan quotas

## Architecture

```
Request
   |
   v
Middleware (auth, rate-limit, logging)
   |
   v
Routes (/api/auth, /api/memories, /api/company-brain, /api/api-keys, /api/user, /api/subscription, /api/admin, /api/waitlist)
   |
   v
Services (memory, company-brain, embedding, relation, subscription)
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
| GET    | /api/memories/graph        | Memory graph data             |
| GET    | /api/memories              | List memories (paginated)     |
| GET    | /api/memories/:id          | Get a single memory           |
| GET    | /api/memories/:id/history  | Get memory version history    |
| PATCH  | /api/memories/:id          | Update a memory               |
| DELETE | /api/memories/:id          | Delete a memory               |
| POST   | /api/memories/:id/forget   | Soft-delete (forget) a memory |
| POST   | /api/memories/:id/feedback | Submit feedback on a memory   |

Memory routes use either API key auth or dashboard session auth. `scope` is the hard isolation boundary for REST/SDK callers; `project` is only a soft grouping/filter inside the selected scope.

### Context Vault (API Key or Session auth)

The public product name is Context Vault. The beta route prefix remains `/api/company-brain` for compatibility.

| Method | Path                                      | Description                                                            |
| ------ | ----------------------------------------- | ---------------------------------------------------------------------- |
| POST   | /api/company-brain/documents              | Ingest extracted text, public file URLs, or documentation/web URLs     |
| POST   | /api/company-brain/documents/upload       | Upload and ingest a document file                                      |
| GET    | /api/company-brain/documents              | List workspace documents and processing state                          |
| POST   | /api/company-brain/documents/:id/cancel   | Stop a pending, retrying, or active document job                       |
| DELETE | /api/company-brain/documents/:id          | Delete a document, chunks, citations, and exclusive extracted memories |
| GET    | /api/company-brain/documents/:id/memories | List extracted memories for a document                                 |
| GET    | /api/company-brain/search                 | Search workspace knowledge in memories, documents, or hybrid mode      |
| GET    | /api/company-brain/memories               | Browse workspace document memories                                     |
| POST   | /api/company-brain/memories/:id/feedback  | Submit feedback on a workspace memory                                  |
| POST   | /api/company-brain/memories/:id/correction | Correct a workspace memory and optionally its cited source chunk       |
| GET    | /api/company-brain/memories/:id/evidence  | Load citations/source chunks for a workspace memory                    |
| GET    | /api/company-brain/hierarchy              | Scope/project hierarchy for workspace memories                         |

Workspace management routes:

| Method | Path                                           | Description                                      |
| ------ | ---------------------------------------------- | ------------------------------------------------ |
| GET    | /api/workspaces                                | List workspaces the current user belongs to      |
| POST   | /api/workspaces                                | Create a workspace and make the caller owner     |
| POST   | /api/workspaces/:id/invitations                | Email an invitation; membership waits for accept |
| POST   | /api/workspaces/invitations/accept             | Accept an invitation token                       |
| GET    | /api/workspaces/:id/team                       | List members and pending invitations             |
| PATCH  | /api/workspaces/:id/members/:memberId          | Update a non-owner member role                   |
| DELETE | /api/workspaces/:id/members/:memberId          | Remove a non-owner member                        |
| DELETE | /api/workspaces/:id/invitations/:invitationId  | Revoke a pending invitation                      |

Context Vault requires workspace membership. Writers can ingest documents; viewers can search and browse. It supports multipart uploads, public file URLs, documentation/web URLs through Exa, and pre-extracted text/Markdown JSON.

Use `workspaceId` as the hard team/tenant boundary. Use `scope` for hard lanes inside a workspace, such as `hr`, `engineering`, or `billing`. Use `project` as a soft grouping/filter inside the selected scope. Search accepts either one `scope` or comma-separated `scopes` for multi-scope retrieval, for example `scopes=dev,billing`.

### API Keys (Session auth)

| Method | Path              | Auth    | Description       |
| ------ | ----------------- | ------- | ----------------- |
| POST   | /api/api-keys     | Session | Create an API key |
| GET    | /api/api-keys     | Session | List all API keys |
| DELETE | /api/api-keys/:id | Session | Revoke an API key |

### User, Subscription, Admin, Waitlist

| Method | Path                          | Auth    | Description                   |
| ------ | ----------------------------- | ------- | ----------------------------- |
| GET    | /api/user/profile             | Session | User profile                  |
| GET    | /api/user/subscription        | Session | Plan and memory usage         |
| GET    | /api/user/dashboard-stats     | Session | Dashboard stats               |
| GET    | /api/user/memory-hierarchy    | Session | Scope-first project hierarchy |
| GET    | /api/subscription/current     | Session | Current subscription          |
| POST   | /api/subscription/change-plan | Session | Change plan via Dodo Payments |
| GET    | /api/admin/\*                 | Admin   | User management and stats     |
| POST   | /api/waitlist                 | None    | Join waitlist                 |

### Health

| Method | Path    | Auth | Description  |
| ------ | ------- | ---- | ------------ |
| GET    | /health | None | Health check |

## Authentication

Public memory API endpoints support the `X-API-Key` header. Dashboard and admin endpoints use Better Auth sessions. Shared memory routes use either-auth: API key first, then session fallback. API keys use an `mc_` prefix, are stored as SHA-256 hashes, and valid keys are cached in Redis.

## Database Schema

### memories

Stores user memories and Context Vault extracted document memories with vector embeddings.

| Field         | Description                                                  |
| ------------- | ------------------------------------------------------------ |
| id            | Unique identifier                                            |
| user_id       | Owner of the memory                                          |
| workspace_id  | Workspace for Context Vault memory; null for personal memory |
| scope         | Optional hard isolation boundary                             |
| content       | The memory text                                              |
| embedding     | 1536-dimension vector                                        |
| category      | preference, fact, decision, or context                       |
| project       | Optional project name                                        |
| memory_type   | user, document, or company                                   |
| source        | mcp, web, or api                                             |
| is_current    | Whether this is the latest version                           |
| supersedes_id | ID of memory this replaces                                   |
| version       | Version number                                               |
| valid_from    | When this memory became true                                 |
| valid_until   | When this memory expires (null=forever)                      |
| content_tsv   | Auto-generated tsvector for FTS                              |

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

These limits currently apply to personal/user memories. Context Vault extracted document memories use `memory_type = document` and are not incremented into `subscriptions.memory_count` during the beta.

### memory_sources

Tracks source notes and Context Vault document jobs.

| Field            | Description                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| workspace_id     | Workspace for document sources; null for personal long-note jobs                     |
| source_type      | text, markdown, pdf, docx, url, csv, image type                                      |
| status           | pending, processing, retrying, completed, failed, or cancelled                       |
| processing_phase | queued, resolving_source, chunking, embedding_chunks, extracting_memories, completed |
| total_chunks     | Planned chunks for processing progress                                               |
| processed_chunks | Chunks embedded/checkpointed so far                                                  |
| storage_key      | R2 object key for uploaded/copied originals                                          |
| payload          | Source metadata, public URL, OCR/scrape details                                      |

### memory_source_chunks

Stores Context Vault source chunks with contextual embeddings, content hashes, section paths, and extraction checkpoint metadata.

### memory_evidence

Links extracted document memories back to their source document and chunk for citations.

### memory_feedback

| Field     | Description                              |
| --------- | ---------------------------------------- |
| memory_id | Memory being rated                       |
| user_id   | Who submitted the feedback               |
| type      | helpful, not_helpful, outdated, or wrong |
| context   | Optional context                         |

### waitlist

| Field    | Description               |
| -------- | ------------------------- |
| email    | Waitlist email            |
| source   | Signup source             |
| referrer | Optional referring source |

## Memory Processing

When a memory is saved:

1. Check if user is within their plan limit
2. Expand the memory text using LLM for searchability + classify temporal category (permanent/short_term/medium_term/long_term)
3. Auto-TTL: if user did NOT provide validUntil, set it from temporal classification (7d/30d/90d/null)
4. Generate vector embedding using text-embedding-3-large
5. Search for similar existing memories (cosine similarity above 0.70, not expired)
6. If similar found, classify relationship using LLM (update, extend, or similar)
7. Store memory with appropriate relations and temporal metadata

When searching:

1. Generate 3 query variants via LLM
2. Run vector search on the original query and all variants
3. Run full-text search on the original query and all variants
4. Merge results via Reciprocal Rank Fusion (RRF)
5. Exclude expired memories (validUntil < now)
6. Apply feedback-based scoring: wrong (0.3x), outdated (0.5x), net-negative (0.7x), helpful (1.1x)
7. Return top K sorted by adjusted relevance scores

## Context Vault Processing

When a document is ingested:

1. Create a `memory_sources` row with pending status.
2. Store uploaded or remote file bytes in Cloudflare R2 when applicable.
3. Resolve text through local decoding, Exa Contents API, or Mistral OCR.
4. Split Markdown/text into structure-aware chunks and embed each chunk.
5. Checkpoint chunk progress in `memory_source_chunks` and `memory_sources`.
6. Extract atomic facts from each chunk into `memories` as `memory_type = document`.
7. Link facts back to chunks through `memory_evidence`.
8. Retry stale/transient processing jobs from the last completed chunk where possible.

Context Vault search supports `memories`, `documents`, and `hybrid` modes. The endpoint returns ranked retrieval results and citations, not a generated final answer. Hybrid search keeps source passages in `chunks[]` and extracted atomic facts in `memories[]`, so callers can pass document context and memory context as separate blocks to their AI layer. Pass `scopes=dev,billing` to retrieve from multiple lanes inside the same workspace.

Corrections use `POST /api/company-brain/memories/:id/correction`. The endpoint updates the extracted memory and, when `correctedChunkContent` is provided, updates the cited source chunk and evidence quote to prevent memory/chunk drift.

## Environment Variables

| Variable                 | Required              | Description                                |
| ------------------------ | --------------------- | ------------------------------------------ |
| DATABASE_URL             | Yes                   | PostgreSQL connection string with pgvector |
| OPENROUTER_API_KEY       | Yes                   | For embeddings and LLM calls               |
| UPSTASH_REDIS_REST_URL   | Yes                   | Redis for caching                          |
| UPSTASH_REDIS_REST_TOKEN | Yes                   | Redis auth token                           |
| PORT                     | No                    | Server port (default: 3000)                |
| NODE_ENV                 | No                    | dev, production, or test                   |
| LOG_LEVEL                | No                    | Logging verbosity                          |
| LOGTAIL_SOURCE_TOKEN     | No                    | Better Stack logging                       |
| LOGTAIL_INGEST_ENDPOINT  | No                    | Better Stack endpoint                      |
| R2_ACCOUNT_ID            | For uploads           | Cloudflare R2 account ID                   |
| R2_ACCESS_KEY_ID         | For uploads           | Cloudflare R2 access key                   |
| R2_SECRET_ACCESS_KEY     | For uploads           | Cloudflare R2 secret key                   |
| R2_BUCKET_NAME           | For uploads           | Cloudflare R2 bucket name                  |
| R2_PUBLIC_BASE_URL       | For OCR/open original | Public R2/custom domain                    |
| EXA_API_KEY              | For URL ingestion     | Exa Contents API key                       |
| MISTRAL_API_KEY          | For OCR               | Mistral OCR API key                        |
| MISTRAL_OCR_MODEL        | No                    | OCR model, defaults to mistral-ocr-latest  |

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
