# AGENTS.md - Shared Types (packages/types)

## Structure

```
packages/types/
├── src/
│   ├── memory.ts       # Memory, MemoryRelation types
│   ├── user.ts         # User, ApiKey types
│   ├── admin.ts        # Admin response types
│   ├── api.ts          # Request/Response types
│   └── index.ts        # Re-exports
├── package.json
└── tsconfig.json
```

## Usage

Import in other packages:

```typescript
import type { Memory, SaveMemoryRequest } from "@memcontext/types";
```

## Patterns

### Type Definitions

```typescript
// src/memory.ts
export interface Memory {
  id: string;
  userId: string;
  scope?: string;
  content: string;
  category?: "preference" | "fact" | "decision" | "context";
  project?: string;
  source: "mcp" | "web" | "api" | "openclaw";
  isCurrent: boolean;
  validFrom?: Date;
  validUntil?: Date;
  version: number;
  createdAt: Date;
}

export interface SaveMemoryRequest {
  content: string;
  category?: Memory["category"];
  scope?: string;
  project?: string;
  validUntil?: string;
}

export interface SearchMemoryRequest {
  query: string;
  limit?: number;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  threshold?: number;
}

export interface SaveMemoryResponse {
  id: string;
  status: "saved" | "updated" | "extended" | "duplicate";
  superseded?: string;
  existingId?: string;
}

export type FeedbackType = "helpful" | "not_helpful" | "outdated" | "wrong";

export interface MemoryProfile {
  static: string[];
  dynamic: string[];
}

export interface MemoryHistoryResponse {
  current: Memory;
  history: Memory[];
}

export interface MemoryGraphResponse {
  nodes: MemoryGraphNode[];
  links: MemoryGraphLink[];
  meta: {
    totalNodes: number;
    totalLinks: number;
    relationLinks: number;
    derivedLinks: number;
  };
}
```

### Re-exports

```typescript
// src/index.ts
export * from "./memory";
export * from "./user";
export * from "./api";
```

## Rules

1. **Types only** - No runtime code
2. **Export everything** - From index.ts
3. **Use interfaces** - For object shapes
4. **Use type aliases** - For unions and simple types
5. **Keep SDK types synced** - Public API shape changes in `packages/types` must also be mirrored in `packages/sdk/src/types.ts`
6. **Scope is first-class** - Public REST/SDK memory request and response types should preserve optional `scope`
