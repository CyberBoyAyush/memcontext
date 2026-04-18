# Graph Report - /Users/ayush/Coding/WebSite/memcontext  (2026-04-19)

## Corpus Check
- 174 files · ~105,973 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 454 nodes · 613 edges · 94 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin users and auth|Admin users and auth]]
- [[_COMMUNITY_MemContext API architecture|MemContext API architecture]]
- [[_COMMUNITY_Redis cache utilities|Redis cache utilities]]
- [[_COMMUNITY_Dashboard page utilities|Dashboard page utilities]]
- [[_COMMUNITY_Memory processing pipeline|Memory processing pipeline]]
- [[_COMMUNITY_Memory enhancement roadmap|Memory enhancement roadmap]]
- [[_COMMUNITY_Application error handling|Application error handling]]
- [[_COMMUNITY_Better Stack usage stats|Better Stack usage stats]]
- [[_COMMUNITY_MCP API client|MCP API client]]
- [[_COMMUNITY_Trust block hooks|Trust block hooks]]
- [[_COMMUNITY_Referrer tracking hook|Referrer tracking hook]]
- [[_COMMUNITY_Search optimization plan|Search optimization plan]]
- [[_COMMUNITY_Subscription payment integration|Subscription payment integration]]
- [[_COMMUNITY_IDE auto-config prompts|IDE auto-config prompts]]
- [[_COMMUNITY_Sidebar state provider|Sidebar state provider]]
- [[_COMMUNITY_Memory query mutations|Memory query mutations]]
- [[_COMMUNITY_Admin session guards|Admin session guards]]
- [[_COMMUNITY_Admin query options|Admin query options]]
- [[_COMMUNITY_Feature highlight visuals|Feature highlight visuals]]
- [[_COMMUNITY_OAuth sign-in page|OAuth sign-in page]]
- [[_COMMUNITY_React Query provider|React Query provider]]
- [[_COMMUNITY_Profile page skeletons|Profile page skeletons]]
- [[_COMMUNITY_Sidebar interaction logic|Sidebar interaction logic]]
- [[_COMMUNITY_Authenticated API fetch|Authenticated API fetch]]
- [[_COMMUNITY_API key mutations|API key mutations]]
- [[_COMMUNITY_Root app layout|Root app layout]]
- [[_COMMUNITY_Site footer|Site footer]]
- [[_COMMUNITY_Site header|Site header]]
- [[_COMMUNITY_Pattern timeline page|Pattern timeline page]]
- [[_COMMUNITY_Toast notifications|Toast notifications]]
- [[_COMMUNITY_Skeleton loading provider|Skeleton loading provider]]
- [[_COMMUNITY_Auth page header|Auth page header]]
- [[_COMMUNITY_Chart container hooks|Chart container hooks]]
- [[_COMMUNITY_API key generation|API key generation]]
- [[_COMMUNITY_Sign logo chevrons|Sign logo chevrons]]
- [[_COMMUNITY_Admin and user types|Admin and user types]]
- [[_COMMUNITY_Home page|Home page]]
- [[_COMMUNITY_Pricing page|Pricing page]]
- [[_COMMUNITY_Hero background dots|Hero background dots]]
- [[_COMMUNITY_Stats bar|Stats bar]]
- [[_COMMUNITY_Memory pipeline showcase|Memory pipeline showcase]]
- [[_COMMUNITY_Hero memory cards|Hero memory cards]]
- [[_COMMUNITY_How it works|How it works]]
- [[_COMMUNITY_Launch video player|Launch video player]]
- [[_COMMUNITY_Waitlist signup|Waitlist signup]]
- [[_COMMUNITY_Request middleware|Request middleware]]
- [[_COMMUNITY_Home page|Home page]]
- [[_COMMUNITY_Global error page|Global error page]]
- [[_COMMUNITY_Not found page|Not found page]]
- [[_COMMUNITY_Legend page|Legend page]]
- [[_COMMUNITY_Auth layout|Auth layout]]
- [[_COMMUNITY_Theme provider|Theme provider]]
- [[_COMMUNITY_Brand chevron motif|Brand chevron motif]]
- [[_COMMUNITY_Neon logomark gradients|Neon logomark gradients]]
- [[_COMMUNITY_Dual chevron logo|Dual chevron logo]]
- [[_COMMUNITY_Dashboard app icon|Dashboard app icon]]
- [[_COMMUNITY_API module|API module]]
- [[_COMMUNITY_Memory module|Memory module]]
- [[_COMMUNITY_Index exports|Index exports]]
- [[_COMMUNITY_PostCSS config|PostCSS config]]
- [[_COMMUNITY_Next env types|Next env types]]
- [[_COMMUNITY_ESLint config|ESLint config]]
- [[_COMMUNITY_Next.js config|Next.js config]]
- [[_COMMUNITY_Use cases section|Use cases section]]
- [[_COMMUNITY_Final CTA section|Final CTA section]]
- [[_COMMUNITY_Pricing section|Pricing section]]
- [[_COMMUNITY_Index exports|Index exports]]
- [[_COMMUNITY_FAQ section|FAQ section]]
- [[_COMMUNITY_PostCSS config|PostCSS config]]
- [[_COMMUNITY_Next env types|Next env types]]
- [[_COMMUNITY_ESLint config|ESLint config]]
- [[_COMMUNITY_Next.js config|Next.js config]]
- [[_COMMUNITY_Loading screen|Loading screen]]
- [[_COMMUNITY_Layout content wrapper|Layout content wrapper]]
- [[_COMMUNITY_Page component|Page component]]
- [[_COMMUNITY_Page component|Page component]]
- [[_COMMUNITY_Layout component|Layout component]]
- [[_COMMUNITY_Loading screen|Loading screen]]
- [[_COMMUNITY_Card component|Card component]]
- [[_COMMUNITY_Label component|Label component]]
- [[_COMMUNITY_Button component|Button component]]
- [[_COMMUNITY_Input component|Input component]]
- [[_COMMUNITY_Auth client|Auth client]]
- [[_COMMUNITY_Drizzle config|Drizzle config]]
- [[_COMMUNITY_MemContext brandmark|MemContext brandmark]]
- [[_COMMUNITY_File icon|File icon]]
- [[_COMMUNITY_Zed logo|Zed logo]]
- [[_COMMUNITY_Gemini logo|Gemini logo]]
- [[_COMMUNITY_Vercel logo|Vercel logo]]
- [[_COMMUNITY_Next.js logo|Next.js logo]]
- [[_COMMUNITY_OpenCode logo|OpenCode logo]]
- [[_COMMUNITY_OpenCode logo|OpenCode logo]]
- [[_COMMUNITY_Sign logomark|Sign logomark]]
- [[_COMMUNITY_Dashboard logo mark|Dashboard logo mark]]

## God Nodes (most connected - your core abstractions)
1. `Error()` - 34 edges
2. `search_memory Tool` - 9 edges
3. `withTiming()` - 8 edges
4. `MemContext MCP Server` - 8 edges
5. `REST API Reference` - 8 edges
6. `normalizeProjectName()` - 7 edges
7. `getUserUsageStats()` - 7 edges
8. `saveMemory()` - 7 edges
9. `MemContext API Service` - 7 edges
10. `API Key Authentication` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Hybrid Search` --semantically_similar_to--> `Hybrid Search with RRF`  [INFERRED] [semantically similar]
  docs/guides/evolving-memory.mdx → internal-docs/enhancement.md
- `Memory Expansion on Save` --conceptually_related_to--> `save_memory Tool`  [INFERRED]
  internal-docs/search-optimization.md → docs/mcp/save-memory.mdx
- `Forget Endpoint` --conceptually_related_to--> `delete_memory Tool`  [INFERRED]
  internal-docs/enhancement.md → docs/mcp/delete-memory.mdx
- `Configurable Search Threshold` --conceptually_related_to--> `search_memory Tool`  [INFERRED]
  internal-docs/enhancement.md → docs/mcp/search-memory.mdx
- `main()` --calls--> `Error()`  [INFERRED]
  apps/mcp/src/index.ts → apps/dashboard/src/app/error.tsx

## Hyperedges (group relationships)
- **MCP Tooling Bundle** — mcp-setup_hosted_mcp_server, mcp-setup_agent_instructions, save-memory_save_memory, search-memory_search_memory, memory-feedback_memory_feedback, delete-memory_delete_memory [INFERRED 0.80]
- **Payment Subscription System** — payment-architecture-diagram_payment_architecture, payment-architecture-diagram_subscription_webhook_flow, payment-architecture-diagram_api_key_cache, payment-architecture-diagram_dodo_payments, payment-integration-analysis_payment_integration_analysis [INFERRED 0.90]
- **Memory Platform Enhancements** — enhancement_enhancement_plan, enhancement_hybrid_search_rrf, enhancement_temporal_support, enhancement_profile_endpoint, enhancement_memory_history_endpoint, enhancement_configurable_threshold, enhancement_forget_endpoint [EXTRACTED 1.00]
- **Sign Logo Mark** — sign_sign_logo, sign_white_chevron_segment, sign_orange_chevron_segment [EXTRACTED 1.00]

## Communities

### Community 0 - "Admin users and auth"
Cohesion: 0.08
Nodes (13): updateUserPlan(), updateLastUsed(), validateApiKey(), hashApiKey(), checkDbConnection(), closeDb(), getConnectionString(), getPool() (+5 more)

### Community 1 - "MemContext API architecture"
Cohesion: 0.08
Nodes (39): Business Logic in API Rule, MemContext Monorepo Architecture, Hono API Patterns, API Route Surface, Memories Table, Memory Feedback Table, Memory Relations Table, MemContext API Service (+31 more)

### Community 2 - "Redis cache utilities"
Cohesion: 0.11
Nodes (25): cacheApiKey(), cacheProfile(), getCachedApiKey(), getCachedProfile(), getCacheKey(), getProfileCacheKey(), invalidateApiKey(), invalidateCachedProfile() (+17 more)

### Community 3 - "Dashboard page utilities"
Cohesion: 0.08
Nodes (14): cn(), copyKey(), formatDate(), handleClose(), handleConfirm(), handleDelete(), handleManageBilling(), handleRefresh() (+6 more)

### Community 4 - "Memory processing pipeline"
Cohesion: 0.14
Nodes (19): expandMemory(), generateEmbedding(), generateQueryVariants(), runEvaluation(), findSimilarMemories(), getMemory(), getMemoryHistory(), getMemoryProfile() (+11 more)

### Community 5 - "Memory enhancement roadmap"
Cohesion: 0.16
Nodes (24): delete_memory Tool, Configurable Search Threshold, Enhancement Plan, Forget Endpoint, Hybrid Search with RRF, Memory History Endpoint, Profile Endpoint, Temporal Support (+16 more)

### Community 6 - "Application error handling"
Cohesion: 0.17
Nodes (11): AppError, escapeForPrompt(), serializeError(), logError(), classifyWithMultipleMemories(), expandMemory(), generateEmbedding(), generateQueryVariants() (+3 more)

### Community 7 - "Better Stack usage stats"
Cohesion: 0.26
Nodes (12): getConfig(), getSourceTable(), historicalLogsTable(), isBetterStackConfigured(), isRetryableError(), logsTable(), queryBetterStack(), sleep() (+4 more)

### Community 8 - "MCP API client"
Cohesion: 0.24
Nodes (1): main()

### Community 9 - "Trust block hooks"
Cohesion: 0.22
Nodes (3): TrustBlock(), useInView(), useReducedMotion()

### Community 10 - "Referrer tracking hook"
Cohesion: 0.36
Nodes (6): getInitialReferrer(), getSnapshot(), isAcceptedReferrer(), isStoredReferrer(), normalizeReferrer(), useReferrer()

### Community 11 - "Search optimization plan"
Cohesion: 0.29
Nodes (8): NOOP Classification, Optimization Plan, Query Expansion, Top-5 Memory Comparison, Memory Expansion on Save, Multi-Query Search, Parallel Execution, Search Optimization

### Community 12 - "Subscription payment integration"
Cohesion: 0.36
Nodes (8): API Key Cache, Dodo Payments, Payment Architecture, Subscription Webhook Flow, Idempotency Key Blocker, Inactive Subscription Validation Blocker, Payment Integration Analysis, Checkout User Identification Blocker

### Community 13 - "IDE auto-config prompts"
Cohesion: 0.29
Nodes (1): handleCopyPrompt()

### Community 14 - "Sidebar state provider"
Cohesion: 0.29
Nodes (0): 

### Community 15 - "Memory query mutations"
Cohesion: 0.29
Nodes (0): 

### Community 16 - "Admin session guards"
Cohesion: 0.47
Nodes (4): getSession(), requireAdmin(), requireSession(), AdminLayout()

### Community 17 - "Admin query options"
Cohesion: 0.33
Nodes (0): 

### Community 18 - "Feature highlight visuals"
Cohesion: 0.6
Nodes (3): getDistanceFromCenter(), getOpacity(), isHighlight()

### Community 19 - "OAuth sign-in page"
Cohesion: 0.4
Nodes (0): 

### Community 20 - "React Query provider"
Cohesion: 0.5
Nodes (2): getQueryClient(), makeQueryClient()

### Community 21 - "Profile page skeletons"
Cohesion: 0.5
Nodes (0): 

### Community 22 - "Sidebar interaction logic"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Authenticated API fetch"
Cohesion: 0.5
Nodes (1): ApiError

### Community 24 - "API key mutations"
Cohesion: 0.5
Nodes (0): 

### Community 25 - "Root app layout"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 26 - "Site footer"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Site header"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Pattern timeline page"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Toast notifications"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Skeleton loading provider"
Cohesion: 1.0
Nodes (2): SkeletonProvider(), useIsMounted()

### Community 31 - "Auth page header"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "Chart container hooks"
Cohesion: 0.67
Nodes (0): 

### Community 33 - "API key generation"
Cohesion: 0.67
Nodes (0): 

### Community 34 - "Sign logo chevrons"
Cohesion: 0.67
Nodes (3): Orange Chevron Segment, Sign Logo, White Chevron Segment

### Community 35 - "Admin and user types"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Home page"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Pricing page"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Hero background dots"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Stats bar"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Memory pipeline showcase"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Hero memory cards"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "How it works"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Launch video player"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Waitlist signup"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Request middleware"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Home page"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Global error page"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Not found page"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Legend page"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Auth layout"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Theme provider"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Brand chevron motif"
Cohesion: 1.0
Nodes (2): Dual Chevrons Motif, MemContext Brandmark

### Community 53 - "Neon logomark gradients"
Cohesion: 1.0
Nodes (2): Linear Gradients, Neon Logomark

### Community 54 - "Dual chevron logo"
Cohesion: 1.0
Nodes (2): Dual Chevron Mark, MemContext Brand Logo

### Community 55 - "Dashboard app icon"
Cohesion: 1.0
Nodes (2): Dashboard App Icon, Two-Tone Angular Brandmark

### Community 56 - "API module"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Memory module"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Index exports"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "PostCSS config"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Next env types"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "ESLint config"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Next.js config"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Use cases section"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Final CTA section"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Pricing section"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Index exports"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "FAQ section"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "PostCSS config"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Next env types"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "ESLint config"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Next.js config"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Loading screen"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Layout content wrapper"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Page component"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Page component"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Layout component"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Loading screen"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Card component"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Label component"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Button component"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Input component"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Auth client"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Drizzle config"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "MemContext brandmark"
Cohesion: 1.0
Nodes (1): MemContext Brandmark

### Community 85 - "File icon"
Cohesion: 1.0
Nodes (1): File Icon

### Community 86 - "Zed logo"
Cohesion: 1.0
Nodes (1): Zed Logo

### Community 87 - "Gemini logo"
Cohesion: 1.0
Nodes (1): Gemini Logo

### Community 88 - "Vercel logo"
Cohesion: 1.0
Nodes (1): Vercel Logo

### Community 89 - "Next.js logo"
Cohesion: 1.0
Nodes (1): Next.js Logo

### Community 90 - "OpenCode logo"
Cohesion: 1.0
Nodes (1): OpenCode Logo

### Community 91 - "OpenCode logo"
Cohesion: 1.0
Nodes (1): OpenCode Logo

### Community 92 - "Sign logomark"
Cohesion: 1.0
Nodes (1): Sign Logomark

### Community 93 - "Dashboard logo mark"
Cohesion: 1.0
Nodes (1): Dashboard Logo Mark

## Knowledge Gaps
- **41 isolated node(s):** `Business Logic in API Rule`, `Hybrid Multi-Query Search`, `Subscription Plan Limits`, `Upstash Redis API Key Cache`, `Better Auth Session Fallback` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Admin and user types`** (2 nodes): `admin.ts`, `user.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home page`** (2 nodes): `page.tsx`, `Home()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pricing page`** (2 nodes): `page.tsx`, `PricingPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hero background dots`** (2 nodes): `hero.tsx`, `generateDots()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stats bar`** (2 nodes): `stats-bar.tsx`, `StatsBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Memory pipeline showcase`** (2 nodes): `memory-pipeline.tsx`, `MemoryPipeline()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hero memory cards`** (2 nodes): `hero-cards.tsx`, `MemoryCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `How it works`** (2 nodes): `how-it-works.tsx`, `showMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Launch video player`** (2 nodes): `launch-video.tsx`, `toggleMute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Waitlist signup`** (2 nodes): `waitlist.ts`, `joinWaitlist()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Request middleware`** (2 nodes): `middleware.ts`, `middleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Home page`** (2 nodes): `page.tsx`, `HomePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Global error page`** (2 nodes): `global-error.tsx`, `GlobalError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Not found page`** (2 nodes): `not-found.tsx`, `NotFound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Legend page`** (2 nodes): `page.tsx`, `LegendPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth layout`** (2 nodes): `layout.tsx`, `AuthLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Theme provider`** (2 nodes): `theme-provider.tsx`, `ThemeProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Brand chevron motif`** (2 nodes): `Dual Chevrons Motif`, `MemContext Brandmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Neon logomark gradients`** (2 nodes): `Linear Gradients`, `Neon Logomark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dual chevron logo`** (2 nodes): `Dual Chevron Mark`, `MemContext Brand Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard app icon`** (2 nodes): `Dashboard App Icon`, `Two-Tone Angular Brandmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API module`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Memory module`** (1 nodes): `memory.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Index exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS config`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next env types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint config`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Use cases section`** (1 nodes): `use-cases.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Final CTA section`** (1 nodes): `final-cta.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Pricing section`** (1 nodes): `pricing.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Index exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `FAQ section`** (1 nodes): `faq.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS config`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next env types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint config`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js config`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Loading screen`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout content wrapper`** (1 nodes): `layout-content.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page component`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page component`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Layout component`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Loading screen`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card component`** (1 nodes): `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Label component`** (1 nodes): `label.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button component`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Input component`** (1 nodes): `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth client`** (1 nodes): `auth-client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Drizzle config`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `MemContext brandmark`** (1 nodes): `MemContext Brandmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `File icon`** (1 nodes): `File Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Zed logo`** (1 nodes): `Zed Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Gemini logo`** (1 nodes): `Gemini Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vercel logo`** (1 nodes): `Vercel Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js logo`** (1 nodes): `Next.js Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OpenCode logo`** (1 nodes): `OpenCode Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `OpenCode logo`** (1 nodes): `OpenCode Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sign logomark`** (1 nodes): `Sign Logomark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard logo mark`** (1 nodes): `Dashboard Logo Mark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Error()` connect `Redis cache utilities` to `Admin users and auth`, `Dashboard page utilities`, `Application error handling`, `Better Stack usage stats`, `MCP API client`, `IDE auto-config prompts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `handleConfirm()` connect `Dashboard page utilities` to `Redis cache utilities`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `main()` connect `MCP API client` to `Redis cache utilities`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `Error()` (e.g. with `main()` and `handleConfirm()`) actually correct?**
  _`Error()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `search_memory Tool` (e.g. with `save_memory Tool` and `Hybrid Search with RRF`) actually correct?**
  _`search_memory Tool` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `withTiming()` (e.g. with `saveMemory()` and `searchMemories()`) actually correct?**
  _`withTiming()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Business Logic in API Rule`, `Hybrid Multi-Query Search`, `Subscription Plan Limits` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._