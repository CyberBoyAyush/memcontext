<div align="center">

<h1>MemContext</h1>

<h3>Persistent memory for AI coding agents. Save once, retrieve forever.</h3>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.9+-339933?logo=node.js&logoColor=white&style=for-the-badge)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-000000?logo=next.js&logoColor=white&style=for-the-badge)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.7-E36002?logo=hono&logoColor=white&style=for-the-badge)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-0.45-C5F74F?logo=drizzle&logoColor=black&style=for-the-badge)](https://orm.drizzle.team/)
[![Neon](https://img.shields.io/badge/Neon-Serverless_Postgres-0891B2?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTgiIGhlaWdodD0iNTciIHZpZXdCb3g9IjAgMCA1OCA1NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0wIDkuODI3NTlDMCA0LjM5OTk2IDQuNDc3MDUgMCA5Ljk5OTc2IDBINDcuOTk4OUM1My41MjE2IDAgNTcuOTk4NiA0LjM5OTk2IDU3Ljk5ODYgOS44Mjc1OVY0MS41ODkzQzU3Ljk5ODYgNDcuMjA0NSA1MC43Njg0IDQ5LjY0MTQgNDcuMjYxOCA0NS4yMDgyTDM2LjI5OTEgMzEuMzQ4OFY0OC4xNTUyQzM2LjI5OTEgNTMuMDQgMzIuMjY5OCA1NyAyNy4yOTkzIDU3SDkuOTk5NzZDNC40NzcwNSA1NyAwIDUyLjYgMCA0Ny4xNzI0VjkuODI3NTlaTTkuOTk5NzYgNy44NjIwN0M4Ljg5NTIyIDcuODYyMDcgNy45OTk4MSA4Ljc0MjA2IDcuOTk5ODEgOS44Mjc1OVY0Ny4xNzI0QzcuOTk5ODEgNDguMjU3OSA4Ljg5NTIyIDQ5LjEzNzkgOS45OTk3NiA0OS4xMzc5SDI3LjU5OTNDMjguMTUxNiA0OS4xMzc5IDI4LjI5OTMgNDguNjk3OSAyOC4yOTkzIDQ4LjE1NTJWMjUuNjE3OEMyOC4yOTkzIDIwLjAwMjcgMzUuNTI5NSAxNy41NjU2IDM5LjAzNjEgMjEuOTk4OUw0OS45OTg4IDM1Ljg1ODNWOS44Mjc1OUM0OS45OTg4IDguNzQyMDYgNTAuMTAzNCA3Ljg2MjA3IDQ4Ljk5ODggNy44NjIwN0g5Ljk5OTc2WiIgZmlsbD0iIzEyRkZGNyIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTAgOS44Mjc1OUMwIDQuMzk5OTYgNC40NzcwNSAwIDkuOTk5NzYgMEg0Ny45OTg5QzUzLjUyMTYgMCA1Ny45OTg2IDQuMzk5OTYgNTcuOTk4NiA5LjgyNzU5VjQxLjU4OTNDNTcuOTk4NiA0Ny4yMDQ1IDUwLjc2ODQgNDkuNjQxNCA0Ny4yNjE4IDQ1LjIwODJMMzYuMjk5MSAzMS4zNDg4VjQ4LjE1NTJDMzYuMjk5MSA1My4wNCAzMi4yNjk4IDU3IDI3LjI5OTMgNTdIOS45OTk3NkM0LjQ3NzA1IDU3IDAgNTIuNiAwIDQ3LjE3MjRWOS44Mjc1OVpNOS45OTk3NiA3Ljg2MjA3QzguODk1MjIgNy44NjIwNyA3Ljk5OTgxIDguNzQyMDYgNy45OTk4MSA5LjgyNzU5VjQ3LjE3MjRDNy45OTk4MSA0OC4yNTc5IDguODk1MjIgNDkuMTM3OSA5Ljk5OTc2IDQ5LjEzNzlIMjcuNTk5M0MyOC4xNTE2IDQ5LjEzNzkgMjguMjk5MyA0OC42OTc5IDI4LjI5OTMgNDguMTU1MlYyNS42MTc4QzI4LjI5OTMgMjAuMDAyNyAzNS41Mjk1IDE3LjU2NTYgMzkuMDM2MSAyMS45OTg5TDQ5Ljk5ODggMzUuODU4M1Y5LjgyNzU5QzQ5Ljk5ODggOC43NDIwNiA1MC4xMDM0IDcuODYyMDcgNDguOTk4OCA3Ljg2MjA3SDkuOTk5NzZaIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMTA1NThfMTE3NzcpIi8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMCA5LjgyNzU5QzAgNC4zOTk5NiA0LjQ3NzA1IDAgOS45OTk3NiAwSDQ3Ljk5ODlDNTMuNTIxNiAwIDU3Ljk5ODYgNC4zOTk5NiA1Ny45OTg2IDkuODI3NTlWNDEuNTg5M0M1Ny45OTg2IDQ3LjIwNDUgNTAuNzY4NCA0OS42NDE0IDQ3LjI2MTggNDUuMjA4MkwzNi4yOTkxIDMxLjM0ODhWNDguMTU1MkMzNi4yOTkxIDUzLjA0IDMyLjI2OTggNTcgMjcuMjk5MyA1N0g5Ljk5OTc2QzQuNDc3MDUgNTcgMCA1Mi42IDAgNDcuMTcyNFY5LjgyNzU5Wk05Ljk5OTc2IDcuODYyMDdDOC44OTUyMiA3Ljg2MjA3IDcuOTk5ODEgOC43NDIwNiA3Ljk5OTgxIDkuODI3NTlWNDcuMTcyNEM3Ljk5OTgxIDQ4LjI1NzkgOC44OTUyMiA0OS4xMzc5IDkuOTk5NzYgNDkuMTM3OUgyNy41OTkzQzI4LjE1MTYgNDkuMTM3OSAyOC4yOTkzIDQ4LjY5NzkgMjguMjk5MyA0OC4xNTUyVjI1LjYxNzhDMjguMjk5MyAyMC4wMDI3IDM1LjUyOTUgMTcuNTY1NiAzOS4wMzYxIDIxLjk5ODlMNDkuOTk4OCAzNS44NTgzVjkuODI3NTlDNDkuOTk4OCA4Ljc0MjA2IDUwLjEwMzQgNy44NjIwNyA0OC45OTg4IDcuODYyMDdIOS45OTk3NloiIGZpbGw9InVybCgjcGFpbnQxX2xpbmVhcl8xMDU1OF8xMTc3NykiLz4KPHBhdGggZD0iTTQ4LjAwMDMgMEM1My41MjMgMCA1OCA0LjM5OTk2IDU4IDkuODI3NTlWNDEuNTg5M0M1OCA0Ny4yMDQ1IDUwLjc2OTkgNDkuNjQxNCA0Ny4yNjMzIDQ1LjIwODJMMzYuMzAwNiAzMS4zNDg4VjQ4LjE1NTJDMzYuMzAwNiA1My4wNCAzMi4yNzEyIDU3IDI3LjMwMDggNTdDMjcuODUzMSA1NyAyOC4zMDA4IDU2LjU2IDI4LjMwMDggNTYuMDE3MlYyNS42MTc4QzI4LjMwMDggMjAuMDAyNyAzNS41MzA5IDE3LjU2NTYgMzkuMDM3NSAyMS45OTg5TDUwLjAwMDIgMzUuODU4M1YxLjk2NTUyQzUwLjAwMDIgMC44Nzk5OTIgNDkuMTA0OCAwIDQ4LjAwMDMgMFoiIGZpbGw9IiNCOUZGQjMiLz4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0icGFpbnQwX2xpbmVhcl8xMDU1OF8xMTc3NyIgeDE9IjU3Ljk5ODYiIHkxPSI1NyIgeDI9IjcuOTk2NTciIHkyPSItMC44NjEzMTYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0I5RkZCMyIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNCOUZGQjMiIHN0b3Atb3BhY2l0eT0iMCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MV9saW5lYXJfMTA1NThfMTE3NzciIHgxPSI1Ny45OTg2IiB5MT0iNTciIHgyPSIyMy43MDg3IiB5Mj0iNDMuNDI4NiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgo8c3RvcCBzdG9wLWNvbG9yPSIjMUExQTFBIiBzdG9wLW9wYWNpdHk9IjAuOSIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMxQTFBMUEiIHN0b3Atb3BhY2l0eT0iMCIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+Cjwvc3ZnPgo=&logoColor=white&style=for-the-badge)](https://neon.tech/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.7-EF4444?logo=turborepo&logoColor=white&style=for-the-badge)](https://turbo.build/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0-F69220?logo=pnpm&logoColor=white&style=for-the-badge)](https://pnpm.io/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

</div>

---

## What is MemContext

AI assistants like Claude Desktop, Cursor, and Cline forget everything between sessions. You end up repeating the same preferences, project context, and decisions over and over.

MemContext solves this by providing a persistent memory layer that AI agents can access via the Model Context Protocol (MCP). Your preferences, facts, and decisions are stored as searchable memories that any connected AI assistant can retrieve automatically through semantic search.

## How It Works

1. You tell your AI assistant something worth remembering
2. The assistant saves it to MemContext via MCP
3. Next session, when relevant context is needed, the assistant searches MemContext
4. Your stored memories are retrieved and used automatically

The system uses vector embeddings and semantic search, so memories are found by meaning rather than exact keyword matching.

## Project Structure

This is a Turborepo monorepo with the following structure:

| Package          | Description                                                                    |
| ---------------- | ------------------------------------------------------------------------------ |
| `apps/api`       | Hono backend containing all business logic, database access, and AI processing |
| `apps/mcp`       | MCP server that connects AI assistants to the API                              |
| `apps/dashboard` | Next.js dashboard for users to manage memories, API keys, and settings         |
| `apps/website`   | Marketing landing page                                                         |
| `packages/types` | Shared TypeScript type definitions                                             |

All business logic lives in the API. The MCP server is a thin wrapper that translates MCP protocol calls into API requests.

## Memory Categories

Memories can be organized into four categories:

| Category   | Purpose                                             |
| ---------- | --------------------------------------------------- |
| preference | User preferences (coding style, tools, conventions) |
| fact       | Factual information about projects or users         |
| decision   | Technical or project decisions made                 |
| context    | General contextual information                      |

## Memory Relations

When you save a memory, the system automatically checks for similar existing memories and classifies the relationship:

| Relation | Meaning                                                 |
| -------- | ------------------------------------------------------- |
| saved    | New memory, no similar memories found                   |
| updated  | Replaces an existing memory (contradicting information) |
| extended | Adds detail to an existing memory                       |

## Tech Stack

| Component       | Technology                             |
| --------------- | -------------------------------------- |
| Runtime         | Node.js 20.9+                          |
| Package Manager | pnpm 9.0                               |
| Build System    | Turborepo 2.7                          |
| Language        | TypeScript 5.9.2                       |
| API Framework   | Hono 4.7                               |
| Frontend        | Next.js 16.1, React 19, Tailwind CSS 4 |
| Database        | Neon (PostgreSQL with pgvector)        |
| ORM             | Drizzle ORM 0.45                       |
| Cache           | Upstash Redis                          |
| Auth            | Better Auth                            |
| AI/Embeddings   | OpenRouter, Vercel AI SDK              |
| MCP             | Model Context Protocol SDK             |

## Getting Started

### Prerequisites

- Node.js 20.9+
- pnpm 9.0+
- Neon database (PostgreSQL with pgvector extension)
- Upstash Redis account
- OpenRouter API key

### Installation

Install dependencies:

```
pnpm install
```

### Environment Setup

Create `.env` files in both `apps/api` and `apps/mcp` based on their respective `.env.example` files.

The API requires:

- DATABASE_URL (PostgreSQL with pgvector)
- OPENROUTER_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

The MCP server requires:

- MEMCONTEXT_API_KEY (your API key from the API)
- MEMCONTEXT_API_URL (defaults to http://localhost:3000)

### Development

Run all apps:

```
pnpm dev
```

Run a specific app:

```
pnpm dev --filter=@memcontext/api
pnpm dev --filter=@memcontext/mcp
```

### Build

Build all packages:

```
pnpm build
```

## Connecting AI Assistants

Add MemContext to your favorite AI coding assistant. Replace `<your-api-key>` with your actual API key (starts with `mc_`).

<details>
<summary><strong>Claude Code (CLI)</strong></summary>

Add MemContext globally (available across all projects):

```bash
claude mcp add memcontext --scope user -- npx -y mcp-remote https://mcp.memcontext.in/mcp --header "MEMCONTEXT-API-KEY:<your-api-key>"
```

Or for a specific project only:

```bash
claude mcp add memcontext -- npx -y mcp-remote https://mcp.memcontext.in/mcp --header "MEMCONTEXT-API-KEY:<your-api-key>"
```

Verify installation:

```bash
claude mcp list
```

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to your Cursor MCP config:

- **Global:** `~/.cursor/mcp.json`
- **Project:** `.cursor/mcp.json` in your project root

```json
{
  "mcpServers": {
    "memcontext": {
      "type": "http",
      "url": "https://mcp.memcontext.in/mcp",
      "headers": {
        "MEMCONTEXT-API-KEY": "<your-api-key>"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>OpenCode</strong></summary>

Add to your `opencode.json` config:

- **Global:** `~/.config/opencode/opencode.json`
- **Project:** `opencode.json` in your project root

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memcontext": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "mcp-remote",
        "https://mcp.memcontext.in/mcp",
        "--header",
        "MEMCONTEXT-API-KEY:<your-api-key>"
      ],
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary><strong>Codex CLI (OpenAI)</strong></summary>

Add to your `~/.codex/config.toml`:

```toml
[mcp_servers.memcontext]
url = "https://mcp.memcontext.in/mcp"

[mcp_servers.memcontext.http_headers]
MEMCONTEXT-API-KEY = "<your-api-key>"
```

Verify installation:

```bash
codex mcp list
```

</details>

<details>
<summary><strong>Windsurf / Other MCP Clients</strong></summary>

For clients that support Streamable HTTP transport directly:

```json
{
  "mcpServers": {
    "memcontext": {
      "type": "http",
      "url": "https://mcp.memcontext.in/mcp",
      "headers": {
        "MEMCONTEXT-API-KEY": "<your-api-key>"
      }
    }
  }
}
```

For clients that only support stdio transport, use the `mcp-remote` bridge:

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

</details>

## API Endpoints

| Method | Path                 | Description       |
| ------ | -------------------- | ----------------- |
| POST   | /api/memories        | Save a memory     |
| GET    | /api/memories/search | Search memories   |
| POST   | /api/api-keys        | Create an API key |
| GET    | /api/api-keys        | List API keys     |
| DELETE | /api/api-keys/:id    | Revoke an API key |
| GET    | /health              | Health check      |

All memory endpoints require authentication via `X-API-Key` header.

## MCP Tools

The MCP server exposes two tools to AI assistants:

| Tool          | Description                                        |
| ------------- | -------------------------------------------------- |
| save_memory   | Save a memory with optional category and project   |
| search_memory | Search for relevant memories with optional filters |

## Plan Limits

| Plan  | Memory Limit |
| ----- | ------------ |
| free  | 300          |
| hobby | 2,000        |
| pro   | 10,000       |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
