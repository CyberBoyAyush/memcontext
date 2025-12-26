# AGENTS.md - Shared Types (packages/types)

## Structure

```
packages/types/
├── src/
│   ├── memory.ts       # Memory, MemoryRelation types
│   ├── user.ts         # User, ApiKey types
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
  content: string;
  category?: "preference" | "fact" | "decision" | "context";
  project?: string;
  isCurrent: boolean;
  createdAt: Date;
}

export interface SaveMemoryRequest {
  content: string;
  category?: Memory["category"];
  project?: string;
}

export interface SaveMemoryResponse {
  id: string;
  status: "saved" | "updated" | "extended";
  superseded?: string;
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
