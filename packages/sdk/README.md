# memcontext-sdk

Official TypeScript SDK for [MemContext](https://memcontext.in), persistent memory infrastructure for AI agents and applications.

- Website: [memcontext.in](https://memcontext.in)
- Documentation: [docs.memcontext.in](https://docs.memcontext.in)
- Package: [npmjs.com/package/memcontext-sdk](https://www.npmjs.com/package/memcontext-sdk)

## Install

```bash
npm install memcontext-sdk
```

## Quickstart

```typescript
import { MemContextClient } from "memcontext-sdk";

const client = new MemContextClient({
  apiKey: process.env.MEMCONTEXT_API_KEY!,
});

const userMemory = client.withScope("user_123");
const projectMemory = userMemory.withProject("memcontext");

await projectMemory.save({
  content: "User prefers concise release notes",
  category: "preference",
});

const results = await projectMemory.search({
  query: "How should release notes be written?",
});

console.log(results.memories);
```

`save()` may return either a final synchronous result (`saved`, `updated`, `extended`, `duplicate`) or `accepted` for larger notes. When the status is `accepted`, the response includes a `jobId` and message so you can track extraction into atomic memories.

## Scope And Projects

Use `scope` as the hard isolation boundary when one API key serves multiple users or tenants. Use `project` as a grouping filter inside that scope.

```typescript
const tenant = client.withScope("tenant_acme_user_123");
const app = tenant.withProject("supportbot");
```

## Common Methods

```typescript
await client.save({ content: "...", category: "fact" });
await client.search({ query: "What does the user prefer?" });
await client.list({ limit: 20 });
await client.profile();
await client.graph();
await client.feedback("memory-id", { type: "helpful" });
await client.delete("memory-id");
```

## Context Vault

Use Context Vault methods for workspace document ingestion and RAG retrieval.
Hybrid search returns separate `chunks[]` and `memories[]` arrays so your app can
send source passages and extracted facts to the AI layer as separate context
blocks.

```typescript
const { workspace } = await client.createWorkspace({ name: "Acme Support" });

await client.inviteWorkspaceMember(workspace.id, {
  email: "teammate@example.com",
  role: "member",
});

const team = await client.listWorkspaceTeam(workspace.id);

await client.ingestContextVaultDocument({
  workspaceId: workspace.id,
  title: "Public docs",
  uri: "https://docs.example.com",
  sourceType: "url",
  crawlSubpages: true,
  priorityPageLimit: 15,
});

const results = await client.searchContextVault({
  workspaceId: workspace.id,
  query: "How do refunds work?",
  mode: "hybrid",
  scopes: ["support", "billing"],
});

console.log(results.chunks);
console.log(results.memories);
```

Use `scope` for one hard lane inside a workspace, or `scopes` for multi-scope
retrieval inside the same workspace. Use `project` as a soft grouping filter
inside the selected scope or scopes.

Corrections update extracted workspace memories. When you also provide
`correctedChunkContent`, MemContext updates the cited source chunk so document
retrieval stays aligned with the corrected memory.

```typescript
await client.correctContextVaultMemory("memory-id", {
  workspaceId: workspace.id,
  type: "wrong",
  reason: "The trial period changed.",
  correctedContent: "The free trial lasts 30 days.",
  correctedChunkContent: "The free trial lasts 30 days.",
});
```

File uploads are supported with `uploadContextVaultDocument()`:

```typescript
await client.uploadContextVaultDocument({
  workspaceId: workspace.id,
  title: "Employee handbook",
  file,
  filename: "handbook.pdf",
  sourceType: "pdf",
});
```

See the full SDK reference at [docs.memcontext.in](https://docs.memcontext.in/sdk/typescript).

## License

GPL-3.0
