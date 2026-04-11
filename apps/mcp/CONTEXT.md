# CONTEXT.md - MCP Server (apps/mcp)

## Purpose

Thin MCP wrapper that connects Claude Desktop to apps/api. No business logic here.

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.25.0",
  "zod": "^4.2.0"
}
```

## Tools (4)

### save_memory

Save a memory to the user's account.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | The memory (atomic fact) |
| category | enum | No | preference / fact / decision / context |
| project | string | No | Project name (lowercase) |
| validUntil | string | No | ISO 8601 datetime when this expires |

**Output:**

```json
{
  "id": "mem_abc123",
  "status": "saved" | "updated" | "extended",
  "superseded": "mem_xyz789"
}
```

### search_memory

Find relevant memories using hybrid search (vector + keyword + RRF).

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | Search query |
| limit | number | No | Max results (default 5, max 10) |
| category | enum | No | Filter by category |
| project | string | No | Filter by project |
| threshold | number | No | Similarity threshold 0-1 (default 0.6) |

**Output:**

```json
{
  "found": 3,
  "memories": [
    {
      "id": "mem_abc123",
      "content": "User prefers TypeScript",
      "category": "preference",
      "relevance": 0.92,
      "created": "2025-01-15"
    }
  ]
}
```

### memory_feedback

Rate a retrieved memory.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| memoryId | string | Yes | Memory ID from search results |
| type | enum | Yes | helpful / not_helpful / outdated / wrong |
| context | string | No | Why this feedback |

### delete_memory

Delete a memory by ID.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| memoryId | string | Yes | Memory ID from search results |

## Flow

```
Claude Desktop
      │
      │ MCP stdio
      ▼
  apps/mcp
      │
      │ HTTP + API Key
      ▼
  apps/api
      │
      ▼
  Postgres
```

## Project Name Normalization

Before sending to API:

```typescript
function normalizeProject(project?: string): string | undefined {
  if (!project) return undefined;
  return project.toLowerCase().replace(/[\s\-_]/g, "");
}
```

Examples:

- "Capy Chat" -> "capychat"
- "My-Project" -> "myproject"
- "test_app" -> "testapp"

## Error Responses

Return user-friendly messages:

```typescript
try {
  const result = await apiClient.post("/api/memories", args);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
} catch (error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true,
  };
}
```

## Authentication

API key passed via environment variable:

```
MEMCONTEXT_API_KEY=mc_a1b2c3d4...
```

Sent in every request as `X-API-Key` header.
