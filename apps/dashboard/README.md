# MemContext Dashboard

Next.js dashboard for managing memories, API keys, MCP setup, subscriptions, and account settings.

## Features

- Scope-first memory management with search, category/project filters, edit, delete, feedback, and version history
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
