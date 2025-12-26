# CONTEXT.md - MCP Server (apps/mcp)

## Purpose

Thin MCP wrapper that connects Claude Desktop to apps/api. No business logic here.

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",
  "zod": "^3.25.0"
}
```

## Tools (Only 2)

### save_memory

Save a memory to the user's account.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| content | string | Yes | The memory (atomic fact) |
| category | enum | No | preference / fact / decision / context |
| project | string | No | Project name (lowercase) |

**Output:**
```json
{
  "id": "mem_abc123",
  "status": "saved" | "updated" | "extended",
  "superseded": "mem_xyz789"
}
```

### search_memory

Find relevant memories using semantic search.

**Input:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | Search query |
| limit | number | No | Max results (default 5, max 10) |
| category | enum | No | Filter by category |
| project | string | No | Filter by project |

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
