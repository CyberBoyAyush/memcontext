<div align="center">

<h1>MemContext</h1>

<h3>Persistent, evolving memory for AI agents and applications. Save once, retrieve forever.</h3>

<p>
  <a href="https://memcontext.in">Website</a> &middot;
  <a href="https://app.memcontext.in">Dashboard</a> &middot;
  <a href="https://docs.memcontext.in">Docs</a> &middot;
  <a href="https://app.memcontext.in/mcp">Setup Guide</a>
</p>

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

## What is MemContext?

AI assistants like Claude Desktop, Cursor, and Cline forget everything between sessions. You end up repeating the same preferences, project context, and decisions over and over.

MemContext solves this by providing a persistent memory layer that AI agents can access via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). Your preferences, facts, and decisions are stored as searchable memories that any connected AI assistant can retrieve automatically through hybrid search (vector similarity + full-text keyword search). Memories can evolve over time with versioning, temporal expiry, and feedback loops.

## Quick Start

Get up and running in under 2 minutes:

1. **Sign up** at [app.memcontext.in](https://app.memcontext.in) (Google or GitHub OAuth)
2. **Create an API key** from the [dashboard](https://app.memcontext.in/api-keys) (starts with `mc_`)
3. **Connect your AI assistant** using the config below
4. **Add the agent instructions** so your assistant knows when to save and search

That's it. Your assistant now has persistent memory across sessions.

## Connecting AI Assistants

Replace `<your-api-key>` with your actual API key from the dashboard.

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

## Agent Instructions

After connecting MCP, add these instructions to your AI assistant so it knows when to save and search memories. The [dashboard setup page](https://app.memcontext.in/mcp) has copy-paste configs for each agent.

| Agent       | Instructions File                          |
| ----------- | ------------------------------------------ |
| Claude Code | `~/.claude/CLAUDE.md`                      |
| Cursor      | Settings > Rules and Commands > User Rules |
| OpenCode    | `~/.config/opencode/AGENTS.md`             |
| Codex CLI   | `~/.codex/instructions.md`                 |

Add this to the relevant file:

```markdown
# MemContext

At conversation start, ALWAYS call search_memory to load user context - do not skip.
Before making decisions or assumptions, search_memory to check for past context.
SAVE immediately (do not defer) when any of these happen:

- User shares a preference -> save_memory(category: "preference")
- A technology or architecture decision is made -> save_memory(category: "decision")
- User corrects you or says "remember" -> save_memory(category: "fact")
- Important project fact learned -> save_memory(category: "fact", project: "<name>")
- Significant work completed -> save_memory(category: "context")

Duplicates are handled automatically - when in doubt, save.
Memory persists across all sessions - use project param for project-specific context only.
```

## How It Works

1. You tell your AI assistant something worth remembering
2. The assistant saves it to MemContext via MCP
3. Next session, when relevant context is needed, the assistant searches MemContext
4. Your stored memories are retrieved and used automatically

The system uses hybrid search — vector embeddings (1536-dim) for semantic similarity combined with PostgreSQL full-text search for exact keyword matching, merged via Reciprocal Rank Fusion. When saving, the system automatically detects similar existing memories and classifies the relationship as `saved`, `updated`, or `extended`. Memories support temporal validity (`validUntil`) so time-sensitive information is automatically excluded from search results when expired.

## MCP Tools

The MCP server exposes four tools to AI assistants:

### `save_memory`

Save a memory with optional category, project scope, and temporal expiry.

| Parameter    | Type   | Required | Description                                                    |
| ------------ | ------ | -------- | -------------------------------------------------------------- |
| `content`    | string | Yes      | Clear, atomic memory to save (1-10,000 chars)                  |
| `category`   | enum   | No       | `preference`, `fact`, `decision`, or `context`                 |
| `project`    | string | No       | Project scope (lowercase, no spaces). Omit for global memories |
| `validUntil` | string | No       | ISO 8601 datetime when this memory expires                     |

### `search_memory`

Search for relevant memories using hybrid search (vector + keyword).

| Parameter   | Type   | Required | Description                                              |
| ----------- | ------ | -------- | -------------------------------------------------------- |
| `query`     | string | Yes      | Natural language search query (use complete sentences)   |
| `limit`     | number | No       | Results to return, 1-10 (default: 5)                     |
| `category`  | enum   | No       | Filter by `preference`, `fact`, `decision`, or `context` |
| `project`   | string | No       | Filter to a specific project. Omit to search all         |
| `threshold` | number | No       | Similarity threshold 0-1. Higher = broader. Default 0.6  |

### `memory_feedback`

Rate a retrieved memory to improve future retrieval quality.

| Parameter  | Type   | Required | Description                                      |
| ---------- | ------ | -------- | ------------------------------------------------ |
| `memoryId` | string | Yes      | The memory ID (from search results)              |
| `type`     | enum   | Yes      | `helpful`, `not_helpful`, `outdated`, or `wrong` |
| `context`  | string | No       | Why this feedback                                |

### `delete_memory`

Delete a memory by ID.

| Parameter  | Type   | Required | Description                         |
| ---------- | ------ | -------- | ----------------------------------- |
| `memoryId` | string | Yes      | The memory ID (from search results) |

## Memory Categories

| Category     | Purpose                                | Example                              |
| ------------ | -------------------------------------- | ------------------------------------ |
| `preference` | User likes, dislikes, style choices    | "Prefers TypeScript over JavaScript" |
| `fact`       | Objective info about projects or users | "Uses MacOS with Homebrew"           |
| `decision`   | Technical or project decisions         | "Chose PostgreSQL for the database"  |
| `context`    | General background information         | "Working on an e-commerce app"       |

## Memory Relations

When you save a memory, the system automatically checks for similar existing memories:

| Relation   | Meaning                                                 |
| ---------- | ------------------------------------------------------- |
| `saved`    | New memory, no similar memories found                   |
| `updated`  | Replaces an existing memory (contradicting information) |
| `extended` | Adds detail to an existing memory                       |

## Pricing

Start free, scale as your AI memory grows. See [memcontext.in/pricing](https://memcontext.in/pricing) for full details.

|                      | Free      | Hobby     | Pro       |
| -------------------- | --------- | --------- | --------- |
| **Price**            | $0/month  | $5/month  | $15/month |
| **Memories**         | 300       | 2,000     | 10,000    |
| **Memory retrieval** | Limited   | Unlimited | Unlimited |
| **Projects**         | Unlimited | Unlimited | Unlimited |
| **MCP integration**  | Yes       | Yes       | Yes       |
| **Support**          | Community | Priority  | Priority  |
| **Early access**     | -         | -         | Yes       |

## Rate Limits

| Operation          | Limit            |
| ------------------ | ---------------- |
| Save memory        | 30 requests/min  |
| Search memory      | 60 requests/min  |
| Feedback           | 30 requests/min  |
| Global (dashboard) | 100 requests/min |

---

## Self-Hosting

MemContext is open source and can be self-hosted. The project is a Turborepo monorepo with the following structure:

| Package          | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `apps/api`       | Hono backend - all business logic, database access, and AI processing |
| `apps/mcp`       | MCP server - thin wrapper that translates MCP calls into API requests |
| `apps/dashboard` | Next.js dashboard - manage memories, API keys, subscriptions          |
| `apps/website`   | Marketing landing page                                                |
| `packages/types` | Shared TypeScript type definitions                                    |
| `docs/`          | Public Mintlify documentation (docs.memcontext.in)                    |

### Tech Stack

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
| Auth            | Better Auth (Google + GitHub OAuth)    |
| Payments        | Dodo Payments                          |
| AI/Embeddings   | OpenRouter, Vercel AI SDK              |
| MCP             | Model Context Protocol SDK             |

### Prerequisites

- Node.js 20.9+
- pnpm 9.0+
- PostgreSQL database with pgvector extension (e.g. [Neon](https://neon.tech/))
- [Upstash Redis](https://upstash.com/) account
- [OpenRouter](https://openrouter.ai/) API key
- Google and/or GitHub OAuth credentials

### Installation

```bash
pnpm install
```

### Environment Setup

Create `.env` files in `apps/api`, `apps/mcp`, `apps/dashboard`, and `apps/website` based on their respective `.env.example` files.

**API (`apps/api/.env`):**

| Variable                                    | Description                                  |
| ------------------------------------------- | -------------------------------------------- |
| `DATABASE_URL`                              | PostgreSQL connection string (with pgvector) |
| `OPENROUTER_API_KEY`                        | For embeddings and LLM classification        |
| `UPSTASH_REDIS_REST_URL`                    | Redis for rate limiting and caching          |
| `UPSTASH_REDIS_REST_TOKEN`                  | Redis auth token                             |
| `BETTER_AUTH_SECRET`                        | Auth secret (min 32 chars)                   |
| `BETTER_AUTH_URL`                           | API URL (e.g. `http://localhost:3000`)       |
| `DASHBOARD_URL`                             | Dashboard URL (e.g. `http://localhost:3020`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials                     |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials                     |

**MCP (`apps/mcp/.env`):**

| Variable             | Description                                   |
| -------------------- | --------------------------------------------- |
| `MEMCONTEXT_API_KEY` | Your API key from the dashboard               |
| `MEMCONTEXT_API_URL` | API URL (defaults to `http://localhost:3000`) |

### Development

```bash
pnpm dev                              # Run all apps
pnpm dev --filter=@memcontext/api     # API only
pnpm dev --filter=@memcontext/mcp     # MCP only
```

### Build

```bash
pnpm build
```

## API Reference

Full API docs: [docs.memcontext.in](https://docs.memcontext.in)

### Memory Endpoints (API Key or Session auth)

| Method | Path                         | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| POST   | `/api/memories`              | Save a memory                 |
| GET    | `/api/memories/search`       | Hybrid search memories        |
| GET    | `/api/memories/profile`      | Pre-aggregated user context   |
| GET    | `/api/memories`              | List memories (with filters)  |
| GET    | `/api/memories/:id`          | Get a single memory           |
| GET    | `/api/memories/:id/history`  | Get memory version history    |
| PATCH  | `/api/memories/:id`          | Update a memory               |
| DELETE | `/api/memories/:id`          | Delete a memory               |
| POST   | `/api/memories/:id/forget`   | Soft-delete (forget) a memory |
| POST   | `/api/memories/:id/feedback` | Submit feedback on a memory   |

### Other Endpoints

| Method | Path                            | Auth         | Description              |
| ------ | ------------------------------- | ------------ | ------------------------ |
| GET    | `/health`                       | None         | Health check             |
| POST   | `/api/api-keys`                 | Session only | Create an API key        |
| GET    | `/api/api-keys`                 | Session only | List API keys            |
| DELETE | `/api/api-keys/:id`             | Session only | Revoke an API key        |
| GET    | `/api/user/profile`             | Session only | Get user profile         |
| GET    | `/api/user/subscription`        | Session only | Get subscription info    |
| GET    | `/api/user/dashboard-stats`     | Session only | Get dashboard statistics |
| POST   | `/api/subscription/change-plan` | Session only | Change subscription plan |
| GET    | `/api/subscription/current`     | Session only | Get current subscription |

## Acknowledgments

MemContext stands on the shoulders of two incredible open-source projects in the AI memory space:

- **[Mem0](https://github.com/mem0ai/mem0)** (50k+ stars) - The pioneering universal memory layer for AI agents. Mem0's work on intelligent memory extraction, user profiling, and their published [research on scalable long-term memory](https://arxiv.org/abs/2504.19413) laid the groundwork for how AI memory systems should work. Apache 2.0 licensed.

- **[Supermemory](https://github.com/supermemoryai/supermemory)** (17k+ stars) - A blazing-fast memory engine ranking #1 on LongMemEval, LoCoMo, and ConvoMem benchmarks. Their open-source plugins for Claude Code, OpenCode, and OpenClaw, along with their MCP-first approach, have been a huge inspiration. MIT licensed.

Both projects proved that persistent AI memory is not just possible but essential. We built MemContext to bring a focused, MCP-native memory layer that's simple to set up and works across every major AI coding assistant.

## Contributing

Contributions are welcome. Please feel free to submit a Pull Request.

## License

This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for details.
