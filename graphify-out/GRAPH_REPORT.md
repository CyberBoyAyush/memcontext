# Graph Report - /Users/ayush/Coding/WebSite/memcontext  (2026-04-19)

## Corpus Check
- 122 files · ~138,974 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 454 nodes · 613 edges · 94 communities detected
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 95 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]

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
- `save_memory Tool` --conceptually_related_to--> `Memory Expansion on Save`  [INFERRED]
  docs/mcp/save-memory.mdx → internal-docs/search-optimization.md
- `delete_memory Tool` --conceptually_related_to--> `Forget Endpoint`  [INFERRED]
  docs/mcp/delete-memory.mdx → internal-docs/enhancement.md
- `search_memory Tool` --conceptually_related_to--> `Configurable Search Threshold`  [INFERRED]
  docs/mcp/search-memory.mdx → internal-docs/enhancement.md
- `main()` --calls--> `Error()`  [INFERRED]
  apps/mcp/src/index.ts → apps/dashboard/src/app/error.tsx

## Hyperedges (group relationships)
- **MCP Tooling Bundle** — mcp-setup_hosted_mcp_server, mcp-setup_agent_instructions, save-memory_save_memory, search-memory_search_memory, memory-feedback_memory_feedback, delete-memory_delete_memory [INFERRED 0.80]
- **Payment Subscription System** — payment-architecture-diagram_payment_architecture, payment-architecture-diagram_subscription_webhook_flow, payment-architecture-diagram_api_key_cache, payment-architecture-diagram_dodo_payments, payment-integration-analysis_payment_integration_analysis [INFERRED 0.90]
- **Memory Platform Enhancements** — enhancement_enhancement_plan, enhancement_hybrid_search_rrf, enhancement_temporal_support, enhancement_profile_endpoint, enhancement_memory_history_endpoint, enhancement_configurable_threshold, enhancement_forget_endpoint [EXTRACTED 1.00]
- **Sign Logo Mark** — sign_sign_logo, sign_white_chevron_segment, sign_orange_chevron_segment [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (13): updateUserPlan(), updateLastUsed(), validateApiKey(), hashApiKey(), checkDbConnection(), closeDb(), getConnectionString(), getPool() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (39): Business Logic in API Rule, MemContext Monorepo Architecture, Hono API Patterns, API Route Surface, Memories Table, Memory Feedback Table, Memory Relations Table, MemContext API Service (+31 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (25): cacheApiKey(), cacheProfile(), getCachedApiKey(), getCachedProfile(), getCacheKey(), getProfileCacheKey(), invalidateApiKey(), invalidateCachedProfile() (+17 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (14): cn(), copyKey(), formatDate(), handleClose(), handleConfirm(), handleDelete(), handleManageBilling(), handleRefresh() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (19): expandMemory(), generateEmbedding(), generateQueryVariants(), runEvaluation(), findSimilarMemories(), getMemory(), getMemoryHistory(), getMemoryProfile() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (24): delete_memory Tool, Configurable Search Threshold, Enhancement Plan, Forget Endpoint, Hybrid Search with RRF, Memory History Endpoint, Profile Endpoint, Temporal Support (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (11): AppError, escapeForPrompt(), serializeError(), logError(), classifyWithMultipleMemories(), expandMemory(), generateEmbedding(), generateQueryVariants() (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.26
Nodes (12): getConfig(), getSourceTable(), historicalLogsTable(), isBetterStackConfigured(), isRetryableError(), logsTable(), queryBetterStack(), sleep() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (1): main()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (3): TrustBlock(), useInView(), useReducedMotion()

### Community 10 - "Community 10"
Cohesion: 0.36
Nodes (6): getInitialReferrer(), getSnapshot(), isAcceptedReferrer(), isStoredReferrer(), normalizeReferrer(), useReferrer()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (8): NOOP Classification, Optimization Plan, Query Expansion, Top-5 Memory Comparison, Memory Expansion on Save, Multi-Query Search, Parallel Execution, Search Optimization

### Community 12 - "Community 12"
Cohesion: 0.36
Nodes (8): API Key Cache, Dodo Payments, Payment Architecture, Subscription Webhook Flow, Idempotency Key Blocker, Inactive Subscription Validation Blocker, Payment Integration Analysis, Checkout User Identification Blocker

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (1): handleCopyPrompt()

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (4): getSession(), requireAdmin(), requireSession(), AdminLayout()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.6
Nodes (3): getDistanceFromCenter(), getOpacity(), isHighlight()

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 0.5
Nodes (2): getQueryClient(), makeQueryClient()

### Community 21 - "Community 21"
Cohesion: 0.5
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (1): ApiError

### Community 24 - "Community 24"
Cohesion: 0.5
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 26 - "Community 26"
Cohesion: 0.67
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 0.67
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (2): SkeletonProvider(), useIsMounted()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.67
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (3): Orange Chevron Segment, Sign Logo, White Chevron Segment

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (2): Dual Chevrons Motif, MemContext Brandmark

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): Linear Gradients, Neon Logomark

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (2): Dual Chevron Mark, MemContext Brand Logo

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (2): Dashboard App Icon, Two-Tone Angular Brandmark

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (0): 

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (0): 

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (0): 

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (0): 

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (1): MemContext Brandmark

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (1): File Icon

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (1): Zed Logo

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (1): Gemini Logo

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Vercel Logo

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Next.js Logo

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): OpenCode Logo

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): OpenCode Logo

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Sign Logomark

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Dashboard Logo Mark

## Knowledge Gaps
- **41 isolated node(s):** `Business Logic in API Rule`, `Hybrid Multi-Query Search`, `Subscription Plan Limits`, `Upstash Redis API Key Cache`, `Better Auth Session Fallback` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 35`** (2 nodes): `admin.ts`, `user.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `page.tsx`, `Home()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `page.tsx`, `PricingPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `hero.tsx`, `generateDots()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `stats-bar.tsx`, `StatsBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `memory-pipeline.tsx`, `MemoryPipeline()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `hero-cards.tsx`, `MemoryCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `how-it-works.tsx`, `showMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `launch-video.tsx`, `toggleMute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `waitlist.ts`, `joinWaitlist()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `middleware.ts`, `middleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `page.tsx`, `HomePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `global-error.tsx`, `GlobalError()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `not-found.tsx`, `NotFound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (2 nodes): `page.tsx`, `LegendPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (2 nodes): `layout.tsx`, `AuthLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (2 nodes): `theme-provider.tsx`, `ThemeProvider()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (2 nodes): `Dual Chevrons Motif`, `MemContext Brandmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (2 nodes): `Linear Gradients`, `Neon Logomark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (2 nodes): `Dual Chevron Mark`, `MemContext Brand Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (2 nodes): `Dashboard App Icon`, `Two-Tone Angular Brandmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `memory.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `use-cases.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `final-cta.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `pricing.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `faq.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `layout-content.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `loading.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `label.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `auth-client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `drizzle.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `MemContext Brandmark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `File Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `Zed Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `Gemini Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Vercel Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Next.js Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `OpenCode Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `OpenCode Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Sign Logomark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Dashboard Logo Mark`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Error()` connect `Community 2` to `Community 0`, `Community 3`, `Community 6`, `Community 7`, `Community 8`, `Community 13`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `handleConfirm()` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `main()` connect `Community 8` to `Community 2`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `Error()` (e.g. with `main()` and `handleConfirm()`) actually correct?**
  _`Error()` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `search_memory Tool` (e.g. with `save_memory Tool` and `Hybrid Search with RRF`) actually correct?**
  _`search_memory Tool` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `withTiming()` (e.g. with `saveMemory()` and `searchMemories()`) actually correct?**
  _`withTiming()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Business Logic in API Rule`, `Hybrid Multi-Query Search`, `Subscription Plan Limits` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._