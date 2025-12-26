# CONTEXT.md - Hono API (apps/api)

## Purpose

Single source of truth for all business logic. Both MCP and web call this API.

## Dependencies

```json
{
  "hono": "^4.11.0",
  "@hono/node-server": "^1.19.0",
  "@hono/zod-validator": "^0.7.0",
  "drizzle-orm": "^0.45.0",
  "pg": "^8.16.0",
  "zod": "^4.2.0",
  "better-auth": "^1.4.0",
  "@openrouter/sdk": "^0.3.0",
  "@upstash/redis": "^1.36.0"
}
```

## Routes

| Method | Path                 | Auth              | Description           |
| ------ | -------------------- | ----------------- | --------------------- |
| POST   | /api/memories        | API Key / Session | Save memory           |
| GET    | /api/memories/search | API Key / Session | Semantic search       |
| GET    | /api/auth/\*         | Public            | Better Auth endpoints |
| POST   | /api/api-keys        | Session only      | Create API key        |
| DELETE | /api/api-keys/:id    | Session only      | Revoke API key        |

## Database Tables

### memories (Core)

```
id              UUID PRIMARY KEY
user_id         TEXT FK
content         TEXT
embedding       VECTOR(1536)
category        TEXT (preference/fact/decision/context)
project         TEXT (nullable, lowercase)
is_current      BOOLEAN (default true)
supersedes_id   UUID FK (nullable)
root_id         UUID FK (nullable)
version         INTEGER (default 1)
deleted_at      TIMESTAMP (nullable)
created_at      TIMESTAMP
```

### memory_relations

```
id              UUID PRIMARY KEY
source_id       UUID FK -> memories
target_id       UUID FK -> memories
relation_type   TEXT (extends/similar)
strength        FLOAT (0-1)
created_at      TIMESTAMP
```

### api_keys

```
id              UUID PRIMARY KEY
user_id         TEXT FK
key_prefix      TEXT (first 8 chars: "mc_a1b2")
key_hash        TEXT (SHA-256)
name            TEXT
last_used_at    TIMESTAMP
created_at      TIMESTAMP
```

## Services

### embedding.ts

- `generateEmbedding(text: string): Promise<number[]>`
- Uses OpenRouter with text-embedding-3-large (1536 dimensions)

### memory.ts

- `saveMemory(userId, content, options): Promise<SaveResult>`
- `searchMemories(userId, query, options): Promise<Memory[]>`
- `findSimilar(userId, embedding, threshold): Promise<Memory | null>`

### relation.ts

- `classifyRelationship(oldMemory, newMemory): Promise<"update" | "extend" | "similar">`
- Uses OpenRouter LLM with JSON Schema: `{"type": "update" | "extend" | "similar"}`
- Default to "similar" on parse failure

## Auth Middleware Logic

```typescript
const apiKey = c.req.header("X-API-Key");

if (apiKey) {
  // MCP request - validate API key
  const user = await validateApiKey(apiKey);
  c.set("user", user);
} else {
  // Web request - check Better Auth session
  const session = await auth.api.getSession(c.req);
  c.set("user", session.user);
}
```

## Similarity Threshold

- Distance < 0.20 = Similarity > 0.80 (trigger LLM classification)
- Search returns top 5 results by default
- Minimum similarity 0.75 for search results

## Caching (Upstash Redis)

Only API key validation is cached:

```typescript
const cacheKey = `apikey:${keyHash}`;
const TTL = 7 * 24 * 60 * 60; // 7 days

// GETEX: Get and extend TTL
const cached = await redis.getex(cacheKey, { ex: TTL });
```

Invalidate on: key revoked, plan changed.
