# AGENTS.md - MemContext Monorepo

## Project Structure

```
memcontext/
├── apps/
│   ├── api/          # Hono backend (all business logic)
│   ├── mcp/          # MCP server (thin wrapper)
│   ├── dashboard/    # Next.js dashboard
│   └── website/      # Landing page
├── packages/
│   └── types/        # Shared TypeScript types
├── docs/             # Public Mintlify documentation
├── internal-docs/    # Internal planning docs (gitignored)
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

| Type             | Convention      | Example                            |
| ---------------- | --------------- | ---------------------------------- |
| Files            | kebab-case      | `save-memory.ts`, `api-client.ts`  |
| Functions        | camelCase       | `saveMemory()`, `validateApiKey()` |
| Variables        | camelCase       | `memoryCount`, `isLoading`         |
| Types/Interfaces | PascalCase      | `Memory`, `ApiKeyResponse`         |
| Constants        | SCREAMING_SNAKE | `MAX_MEMORIES`, `API_BASE_URL`     |

## Package Names

- `@memcontext/api` - apps/api
- `@memcontext/mcp` - apps/mcp
- `@memcontext/dashboard` - apps/dashboard
- `@memcontext/website` - apps/website
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

<!-- Added: 2026-04-11 -->

## Documentation

Use Mintlify for MemContext public documentation. The docs site lives in `docs/` with `docs/docs.json` as the Mintlify config and `docs/openapi.yaml` as the API reference source.

<!-- Added: 2026-04-11 -->

## Documentation Structure

Use `docs/` only for public Mintlify documentation. Store internal planning, architecture notes, and implementation references in `internal-docs/`.

<!-- Added: 2026-04-20 -->
## Website Security Headers
Configure baseline security headers for the public website in `apps/website/next.config.ts`. Disable Next.js `X-Powered-By` with `poweredByHeader: false` and set `Strict-Transport-Security`, `X-Frame-Options`, and `X-Content-Type-Options` alongside the existing CSP.

<!-- Added: 2026-04-22 -->
## Memory Isolation
Use a first-class optional `scope` field as the hard isolation boundary for memory operations. When a request provides `scope`, all save, search, list, profile, get, update, delete, and history queries must only operate within that scope. Keep `project` as a soft grouping and filtering field, not a security boundary.

<!-- Added: 2026-04-25 -->
## Dashboard Memory Hierarchy
Represent memories in the dashboard as a scope-first hierarchy: Global/unscoped memories first, then named scopes, with projects nested inside the selected scope. Treat `scope` as the hard isolation boundary and `project` as a soft grouping within that selected scope. Use a dedicated hierarchy endpoint rather than making global search mean all scopes.

<!-- Added: 2026-04-25 -->
## SDK Type Synchronization
The published `memcontext-sdk` package is self-contained and must not depend on workspace-only packages such as `@memcontext/types`. When changing public API request/response types in `packages/types` or API docs, also update the mirrored public SDK types in `packages/sdk/src/types.ts` and verify `pnpm --filter=memcontext-sdk check-types`, `pnpm --filter=memcontext-sdk build`, and `npm pack --dry-run` from `packages/sdk` before publishing.
