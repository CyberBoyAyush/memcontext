# MemContext MCP Server

Model Context Protocol (MCP) server that connects AI assistants to MemContext.

## Overview

This is a thin wrapper around the MemContext API. It implements the MCP specification, allowing AI assistants like Claude Desktop to save and retrieve memories through standardized tool calls.

The MCP server contains no business logic. All memory processing, storage, and search happens in the API. This server simply translates MCP protocol calls into HTTP requests.

## Tools

The server exposes five tools to AI assistants:

### save_memory

Saves a memory that should be remembered across sessions. Short memories are saved immediately; larger notes may be accepted for background extraction into multiple atomic memories.

| Parameter  | Type   | Required | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| content    | string | Yes      | Clear, atomic memory to save                     |
| category   | string | No       | One of: preference, fact, decision, context      |
| project    | string | No       | Project grouping; normalized before API requests |

Returns a status such as `saved`, `updated`, `extended`, `duplicate`, or `accepted`. When the status is `accepted`, the response includes a `jobId` and message describing the background extraction.

### search_memory

Searches for relevant memories using hybrid search (vector + keyword).

| Parameter | Type   | Required | Description                                      |
| --------- | ------ | -------- | ------------------------------------------------ |
| query     | string | Yes      | What to search for                               |
| limit     | number | No       | Max results (1-10, default 5)                    |
| category  | string | No       | Filter by category                               |
| project   | string | No       | Filter by project                                |
| threshold | number | No       | Similarity threshold 0-1. Higher = broader (0.6) |

Returns matching memories with relevance scores and memory IDs.

### memory_feedback

Rates a retrieved memory to improve future retrieval quality.

| Parameter | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| memoryId  | string | Yes      | The memory ID (from search results)      |
| type      | string | Yes      | helpful, not_helpful, outdated, or wrong |
| context   | string | No       | Why this feedback                        |

Feedback affects ranking only. If a memory is wrong or outdated and the corrected content is known, use `update_memory`.

### update_memory

Corrects or refines an existing saved memory.

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| memoryId  | string | Yes      | The memory ID (from search results) |
| content   | string | Yes      | Correct replacement memory text     |
| category  | string | No       | preference, fact, decision, context |
| project   | string | No       | Project grouping                    |

### delete_memory

Soft-deletes a specific memory by ID.

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| memoryId  | string | Yes      | The memory ID (from search results) |

## Transport Modes

### HTTP (Production)

The hosted MCP server is available at `https://mcp.memcontext.in/mcp`. This is the recommended way to connect AI assistants.

### Stdio (Local Development)

For local development, the server can run as a subprocess communicating via standard input/output.

```
pnpm dev
```

### HTTP (Local Development)

For local HTTP mode, runs an Express server with session management.

```
pnpm dev:http
```

Default port is 3001. Supports up to 1000 concurrent sessions with 1-hour idle timeout.

## Connecting Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "memcontext": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.memcontext.in/mcp",
        "--header",
        "MEMCONTEXT-API-KEY:<your-api-key>"
      ]
    }
  }
}
```

## Environment Variables

| Variable           | Required | Default               | Description        |
| ------------------ | -------- | --------------------- | ------------------ |
| MEMCONTEXT_API_KEY | Yes      | -                     | Your API key       |
| MEMCONTEXT_API_URL | No       | http://localhost:3000 | API server URL     |
| MCP_HTTP_PORT      | No       | 3001                  | Port for HTTP mode |

## Development

Run in stdio mode:

```
pnpm dev
```

Run in HTTP mode:

```
pnpm dev:http
```

Test with MCP Inspector:

```
npx @modelcontextprotocol/inspector
```

## How It Works

1. AI assistant calls an MCP tool such as save_memory, search_memory, or update_memory
2. MCP server receives the tool call via stdio or HTTP
3. Server validates parameters using Zod schemas
4. Server makes HTTP request to MemContext API
5. API response is formatted and returned to the assistant

Project names are automatically normalized (lowercase, no spaces or special characters) before sending to the API. MCP tools intentionally do not expose `scope`; they operate on unscoped assistant memory with optional `project` grouping. REST and SDK clients should use `scope` for hard multi-user or tenant isolation.

## Dependencies

| Package                   | Purpose                      |
| ------------------------- | ---------------------------- |
| @modelcontextprotocol/sdk | MCP protocol implementation  |
| @memcontext/types         | Shared type definitions      |
| zod                       | Parameter validation         |
| express                   | HTTP server (for HTTP mode)  |
| dotenv                    | Environment variable loading |
