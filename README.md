<div align="center">

# MemContext

### Persistent memory for AI coding agents. Save once, retrieve forever.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.9+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Hono](https://img.shields.io/badge/Hono-4.7-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-0.45-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Neon](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599?logo=neon&logoColor=white)](https://neon.tech/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.7-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

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
