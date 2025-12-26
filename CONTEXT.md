# CONTEXT.md - MemContext Project

## What We're Building

Centralized memory system for AI agents. Stores user preferences and project context, retrieves via semantic search. AI assistants like Claude Desktop remember things across sessions.

**Domain:** memcontext.com

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| Backend | Hono (TypeScript) |
| Database | PostgreSQL + pgvector (Neon) |
| ORM | Drizzle |
| Embeddings | OpenAI text-embedding-3-large (1536 dims) |
| Cache | Upstash Redis (API key validation only) |
| Auth | Better Auth (in apps/api) |
| Protocol | MCP (Model Context Protocol) |

## Architecture

```
Claude Desktop / Web Dashboard
         │
         ▼
    apps/mcp / apps/web (thin clients)
         │
         ▼
    apps/api (Hono + Drizzle) ← All business logic
         │
         ▼
    Neon Postgres + pgvector
```

## Database Schema (7 Tables)

**Better Auth (4):** user, session, account, verification

**Custom (3):**
- `api_keys` - MCP authentication (key_hash, user_id, name)
- `memories` - Core table (content, embedding VECTOR(1536), is_current, supersedes_id)
- `memory_relations` - Links between memories (extends/similar)

## Auth Strategy

| Client | Method |
|--------|--------|
| Web Dashboard | Better Auth (session cookie) |
| MCP Server | API Key (X-API-Key header) |

## Relationship Detection (LLM Layer)

When saving a memory with similarity > 0.80 to existing:
1. Call LLM to classify: Update / Extend / Similar
2. **Update** - Supersede old memory (is_current=false)
3. **Extend** - Keep both, add to memory_relations
4. **Similar** - Keep both, add to memory_relations

LLM returns JSON: `{"type": "update"}` via JSON Schema mode.

## MCP Tools (Only 2)

1. **save_memory** - Store memory, auto-detect relationships
2. **search_memory** - Semantic search, returns is_current=true only

## Key Decisions

1. All business logic in apps/api
2. MCP and web are thin clients
3. 1536-dim embeddings (industry standard)
4. Redis for API key cache only (7-day TTL)
5. Soft deletes (deleted_at timestamp)
6. Version chains via supersedes_id + root_id
