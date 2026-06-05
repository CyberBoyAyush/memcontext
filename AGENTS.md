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
│   ├── types/        # Shared TypeScript types
│   └── sdk/          # Published TypeScript SDK
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
- `memcontext-sdk` - packages/sdk

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

MCP tools intentionally do not expose `scope`; they operate on unscoped assistant memory with optional `project` grouping. Use `scope` only through REST/API/dashboard/SDK surfaces where the caller can provide a real tenant/user isolation key.

<!-- Added: 2026-04-25 -->

## Dashboard Memory Hierarchy

Represent memories in the dashboard as a scope-first hierarchy: Global/unscoped memories first, then named scopes, with projects nested inside the selected scope. Treat `scope` as the hard isolation boundary and `project` as a soft grouping within that selected scope. Use a dedicated hierarchy endpoint rather than making global search mean all scopes.

<!-- Added: 2026-04-25 -->

## SDK Type Synchronization

The published `memcontext-sdk` package is self-contained and must not depend on workspace-only packages such as `@memcontext/types`. When changing public API request/response types in `packages/types` or API docs, also update the mirrored public SDK types in `packages/sdk/src/types.ts` and verify `pnpm --filter=memcontext-sdk check-types`, `pnpm --filter=memcontext-sdk build`, and `npm pack --dry-run` from `packages/sdk` before publishing.

<!-- Added: 2026-05-05 -->

## Authentication

Use Better Auth email/password alongside Google and GitHub OAuth. Keep dashboard auth flows on the single `apps/dashboard/src/app/(auth)/login/page.tsx` page, using modes for sign-in, sign-up, forgot password, and reset password. Verification and password reset emails are sent through Resend, and email auth endpoints use Cloudflare Turnstile CAPTCHA.

<!-- Added: 2026-05-05 -->

## Authentication Sessions

Use a 30-day Better Auth session lifetime for dashboard users with a 1-day `updateAge`. This keeps returning users signed in while avoiding session database refreshes on every request.

<!-- Added: 2026-05-15 -->

## Claude Remote MCP OAuth

Use Better Auth's built-in `mcp` plugin in `apps/api` to power Claude remote MCP OAuth. Keep dual auth on `apps/mcp/src/http.ts`: existing API-key headers remain supported, and OAuth Bearer tokens are added for Claude. The dashboard consent UI lives at `/oauth/consent` and Better Auth MCP uses it via `oidcConfig.consentPage`.

<!-- Added: 2026-05-31 -->

## Context Vault / Workspaces UI

Workspace management (create workspace, invite members) lives in the Settings page via the `WorkspacesSection` component at `apps/dashboard/src/components/settings/workspaces-section.tsx`, NOT in the Context Vault (`/company-brain`) page. The Context Vault page stays focused on workspace selection, document ingestion, and search.

Workspace invite roles: the backend (`apps/api/src/routes/workspaces.ts`) only accepts `admin`, `member`, `viewer` for invites — `owner` is auto-assigned to the workspace creator and is NOT invitable. Only owners and admins can invite members.

<!-- Added: 2026-05-31 -->

<!-- Added: 2026-06-03 -->
## Workspace Management Location

Workspace management (create workspace, invite members) lives ONLY in the Context Vault (`apps/dashboard/src/app/(dashboard)/context-vault/page.tsx`), NOT in the Settings page. The Context Vault header has an explicit "Manage workspace" button (GearSix icon) next to the WorkspaceSelect; both open the `ManageWorkspacesDialog`, which embeds the `WorkspacesSection` component (`apps/dashboard/src/components/settings/workspaces-section.tsx`). The Settings page must not import or render `WorkspacesSection`.

In the Context Vault "Search knowledge" filters, both the scope filter and the project filter use the same rounded-full pill button style (active: `border-accent bg-accent/10 text-accent`; inactive: `border-border bg-surface text-foreground-muted hover:border-border-hover hover:text-foreground`) — do not use a native `<select>` for the project filter.

## Memories Page — Unified Source Switcher

The Memories page (`apps/dashboard/src/app/(dashboard)/memories/page.tsx`) is the single place to view both personal and workspace memories. A `MemorySourceSwitcher` (`apps/dashboard/src/components/memory-source-switcher.tsx`) toggles between "My memories" (User icon, personal) and each Workspace (Buildings icon, Context Vault). Within a source, the existing ScopePicker (scope) and ProjectFilter (project) apply.

Workspace memories are READ-ONLY on this page (no edit/delete/feedback/detail panel; delete column shows a Lock icon, content search is hidden, category filter becomes a static label). They are managed in the Context Vault. Personal memories keep full edit/delete behavior unchanged.

Backend: `GET /api/company-brain/memories` (list, supports scope + `projects` comma-separated multi-filter + limit/offset) and `GET /api/company-brain/hierarchy` (scope/project counts) both gate on `requireWorkspaceMember(userId, workspaceId)`. They query `memories` where `workspaceId = ? AND memoryType IN ('document','company') AND isCurrent AND deletedAt IS NULL`. Vault list pagination orders by `createdAt DESC, id DESC` for stable offset paging. Only "Workspace not found" maps to 404; other errors log and return 500.

<!-- Added: 2026-05-31 -->

## Context Vault Memory Detail + Feedback

Workspace (Context Vault) memories support a read-only detail sidebar with feedback via the shared component `apps/dashboard/src/components/vault-memory-detail-panel.tsx` (`VaultMemoryDetailPanel`). It is used in two places: the Memories page (workspace mode — clicking a row) and the Context Vault document-memories modal (clicking a memory card). It renders at z-index 70/71 to sit above the document modal (z-60). It shows content/category/project/created/source document and Helpful/Not helpful/Outdated/Wrong feedback. No edit/delete (those stay in Context Vault management).

Feedback backend: `POST /api/company-brain/memories/:memoryId/feedback` (body: workspaceId, type, context?). Gated by `requireWorkspaceMember` + the memory must match `workspaceId AND memoryType IN ('document','company') AND isCurrent AND not deleted`. Uses `rateLimitFeedback` middleware (parity with personal feedback). Frontend hook: `useSubmitVaultMemoryFeedback`.

The standalone "Extracted knowledge" browse panel was REMOVED from the Context Vault page. Instead, click a document's "N memories" count to open a spacious 2-column modal of that document's extracted memories (`GET /api/company-brain/documents/:documentId/memories`), and click any memory to open the detail sidebar.

In the Memories page workspace mode, each memory row shows its source document (file icon + title) under the content, and the Actions column shows a CaretRight (clickable to open details) instead of a Lock.

<!-- Added: 2026-06-01 -->

## Context Vault Plan Limits

Current Free/Hobby/Pro `PLAN_LIMITS` apply to personal/user memories. Context Vault extracted document memories are saved with `memoryType = "document"` and do not increment `subscriptions.memory_count` during the beta. Public docs and pricing copy should describe the 300 / 2,000 / 10,000 limits as personal memory limits until separate Context Vault limits for documents, storage, OCR/scraping, and extracted facts are implemented.

<!-- Added: 2026-06-05 -->
## Themed Dropdowns (Dashboard)

Do not use native `<select>` elements in the dashboard — they render OS-native menus that break the dark theme. Use the reusable `ThemedSelect` component at `apps/dashboard/src/components/ui/themed-select.tsx` instead. It matches the app dropdown aesthetic (button with border-border/bg-surface + CaretDown, absolute menu with bg-surface-elevated, animate-scale-in, Check marks, click-outside overlay), mirroring `scope-picker.tsx`. Props: value, options ({value,label,disabled?}), onChange, disabled, align ("left"|"right"), capitalize, className. The workspaces management UI (`components/settings/workspaces-section.tsx`) uses it for the workspace picker, billing-owner picker, and member-role picker.

The Manage Workspaces dialog (`ManageWorkspacesDialog` in `app/(dashboard)/context-vault/page.tsx`) uses a landscape width of `max-w-3xl`.
