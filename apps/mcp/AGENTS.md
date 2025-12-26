# AGENTS.md - MCP Server (apps/mcp)

## Structure

```
apps/mcp/
├── src/
│   ├── tools/
│   │   ├── save-memory.ts
│   │   └── search-memory.ts
│   ├── lib/
│   │   └── api-client.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Commands

```bash
pnpm dev          # Start MCP server (stdio)
pnpm build        # Build for distribution
```

## MCP SDK Patterns

### Server Setup
```typescript
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "memcontext",
  version: "1.0.0",
});

// Register tools
server.tool("save_memory", saveMemorySchema, saveMemoryHandler);
server.tool("search_memory", searchMemorySchema, searchMemoryHandler);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Tool Definition
```typescript
// src/tools/save-memory.ts
import { z } from "zod";

export const saveMemorySchema = z.object({
  content: z.string().describe("The memory to save"),
  category: z.enum(["preference", "fact", "decision", "context"]).optional(),
  project: z.string().optional().describe("Project name (lowercase, no spaces)"),
});

export async function saveMemoryHandler(args: z.infer<typeof saveMemorySchema>) {
  const response = await apiClient.post("/api/memories", args);
  return {
    content: [{ type: "text", text: JSON.stringify(response) }],
  };
}
```

### API Client
```typescript
// src/lib/api-client.ts
const API_BASE = process.env.MEMCONTEXT_API_URL || "http://localhost:3000";
const API_KEY = process.env.MEMCONTEXT_API_KEY;

export async function post(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY!,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function get(path: string, params?: Record<string, string>) {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url, {
    headers: { "X-API-Key": API_KEY! },
  });
  return res.json();
}
```

## Tool Descriptions (Guardrails)

Include project naming rules in tool descriptions:

```typescript
const saveMemorySchema = z.object({
  content: z.string(),
  project: z.string().optional().describe(
    "Project name. RULES: lowercase, no spaces, no special characters. " +
    "Examples: 'capychat', 'memcontext'. If user says 'Capy Chat' use 'capychat'."
  ),
});
```

## Environment Variables

```
MEMCONTEXT_API_URL=http://localhost:3000
MEMCONTEXT_API_KEY=mc_...
```

## Claude Desktop Config

User adds to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "memcontext": {
      "command": "npx",
      "args": ["@memcontext/mcp"],
      "env": {
        "MEMCONTEXT_API_KEY": "mc_..."
      }
    }
  }
}
```

## Testing

Use MCP Inspector for testing:
```bash
npx @modelcontextprotocol/inspector
```

## Key Rules

1. **Thin wrapper only** - All logic in apps/api
2. **No database access** - Only HTTP calls to API
3. **Validate inputs** - Use Zod schemas
4. **Handle errors** - Return user-friendly messages
5. **Normalize project names** - Lowercase before sending to API
