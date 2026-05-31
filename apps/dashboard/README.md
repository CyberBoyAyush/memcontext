# MemContext Dashboard

Next.js dashboard for managing memories, Context Vault workspaces, API keys, MCP setup, subscriptions, and account settings.

## Features

- Scope-first memory management with search, category/project filters, edit, delete, feedback, and version history
- Context Vault workspace selection, document ingestion, processing progress, cancellation/deletion, document search, and extracted-memory browsing
- Interactive memory graph with relation filters and focused/full graph modes
- API key generation and management
- MCP setup guides and auto-config prompts for supported agents
- Subscription and billing management via Dodo Payments
- Account settings with light/dark/system theme selection
- Admin/Legend panel for user management and platform statistics

## Development

```bash
pnpm dev
```

The dashboard runs at http://localhost:3002.

## Tech Stack

- Next.js 16 (App Router)
- React Query for data fetching
- Tailwind CSS
- Better Auth for authentication
