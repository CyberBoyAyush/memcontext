# AGENTS.md - Hono API (apps/api)

## Structure

```
apps/api/
├── src/
│   ├── db/
│   │   ├── index.ts          # Drizzle connection
│   │   └── schema.ts         # All table definitions
│   ├── routes/
│   │   ├── auth.ts           # /api/auth/*
│   │   └── memories.ts       # /api/memories/*
│   ├── services/
│   │   ├── embedding.ts      # OpenAI calls
│   │   ├── memory.ts         # CRUD + search
│   │   └── relation.ts       # LLM classification
│   ├── middleware/
│   │   └── auth.ts           # API key + session validation
│   └── index.ts              # Hono app entry
├── drizzle.config.ts
└── package.json
```

## Commands

```bash
pnpm dev                      # Start dev server
pnpm build                    # Build for production
pnpm drizzle-kit generate     # Generate migrations
pnpm drizzle-kit migrate      # Apply migrations
pnpm drizzle-kit push         # Push to dev (no migration file)
```

## Hono Patterns

### Route Files

```typescript
// src/routes/memories.ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", async (c) => {
  return c.json({ memories: [] });
});

app.post("/", async (c) => {
  const body = await c.req.json();
  return c.json({ id: "mem_123" }, 201);
});

export default app;
```

### Mount Routes

```typescript
// src/index.ts
import { Hono } from "hono";
import memories from "./routes/memories";
import auth from "./routes/auth";

const app = new Hono();

app.route("/api/memories", memories);
app.route("/api/auth", auth);

export default app;
```

### Middleware

```typescript
// src/middleware/auth.ts
import { createMiddleware } from "hono/factory";

export const authMiddleware = createMiddleware(async (c, next) => {
  const apiKey = c.req.header("X-API-Key");
  // validate...
  c.set("user", user);
  await next();
});
```

## Drizzle Patterns

### Schema Definition

```typescript
// src/db/schema.ts
import {
  pgTable,
  uuid,
  text,
  vector,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const memories = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  isCurrent: boolean("is_current").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Vector Search

```typescript
import { cosineDistance, lt, and, eq, asc } from "drizzle-orm";

const results = await db
  .select()
  .from(memories)
  .where(and(eq(memories.userId, userId), eq(memories.isCurrent, true)))
  .orderBy(asc(cosineDistance(memories.embedding, queryEmbedding)))
  .limit(5);
```

## Services Pattern

```typescript
// src/services/memory.ts
import { db } from "../db";
import { memories } from "../db/schema";

export async function saveMemory(userId: string, content: string) {
  // 1. Generate embedding
  // 2. Check for similar memories
  // 3. If similar > 0.80, call LLM for classification
  // 4. Insert/update based on classification
}

export async function searchMemories(userId: string, query: string) {
  // 1. Generate query embedding
  // 2. Vector search
  // 3. Return results
}
```

## Environment Variables

```
DATABASE_URL=postgres://...
OPENROUTER_API_KEY=sk-or-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
BETTER_AUTH_SECRET=...
```

## Validation

Use Zod for request validation:

```typescript
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

const schema = z.object({
  content: z.string().min(1),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
});

app.post("/", zValidator("json", schema), async (c) => {
  const { content, category } = c.req.valid("json");
});
```

## Error Handling

```typescript
import { HTTPException } from "hono/http-exception";

// In routes
throw new HTTPException(401, { message: "Invalid API key" });
throw new HTTPException(404, { message: "Memory not found" });
```
