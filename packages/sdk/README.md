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

See the full SDK reference at [docs.memcontext.in](https://docs.memcontext.in/sdk/typescript).

## License

GPL-3.0
