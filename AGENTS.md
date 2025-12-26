# AGENTS.md - MemContext Monorepo

## Project Structure

```
memcontext/
├── apps/
│   ├── api/          # Hono backend (all business logic)
│   └── mcp/          # MCP server (thin wrapper)
├── packages/
│   └── types/        # Shared TypeScript types
├── pnpm-workspace.yaml
└── turbo.json
```

## Commands

```bash
pnpm install                    # Install all dependencies
pnpm dev                        # Run all apps in dev mode
pnpm dev --filter=@memcontext/api   # Run only API
pnpm dev --filter=@memcontext/mcp   # Run only MCP
pnpm build                      # Build all packages
pnpm lint                       # Lint all packages
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `save-memory.ts`, `api-client.ts` |
| Functions | camelCase | `saveMemory()`, `validateApiKey()` |
| Variables | camelCase | `memoryCount`, `isLoading` |
| Types/Interfaces | PascalCase | `Memory`, `ApiKeyResponse` |
| Constants | SCREAMING_SNAKE | `MAX_MEMORIES`, `API_BASE_URL` |

## Package Names

- `@memcontext/api` - apps/api
- `@memcontext/mcp` - apps/mcp
- `@memcontext/types` - packages/types

## Architecture Rules

1. **All business logic in apps/api** - MCP is a thin wrapper that calls API endpoints
2. **No database access outside apps/api** - Only the API touches Drizzle/Postgres
3. **Shared types in packages/types** - Import from `@memcontext/types`
4. **No code duplication** - If both apps need it, put it in packages/

## File Creation

When creating new files:
1. Use kebab-case for filenames: `memory-service.ts` not `memoryService.ts`
2. One export per file when possible
3. Index files for re-exports: `src/services/index.ts`

## Dependencies

- Add shared deps to root: `pnpm add -D typescript -w`
- Add app-specific deps: `pnpm add hono --filter=@memcontext/api`

## Environment Variables

- Root `.env` for shared variables
- App-specific `.env` in each app folder
- Never commit `.env` files

## Before Committing

1. Run `pnpm build` - ensure no type errors
2. Run `pnpm lint` - fix any issues
3. Test the specific app you changed
