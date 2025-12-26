#!/usr/bin/env node
import "./env.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { saveMemorySchema, saveMemoryHandler } from "./tools/save-memory.js";
import {
  searchMemorySchema,
  searchMemoryHandler,
} from "./tools/search-memory.js";

const server = new McpServer({
  name: "memcontext",
  version: "1.0.0",
});

server.registerTool(
  "save_memory",
  {
    title: "Save Memory",
    description:
      "Save a memory or preference that should be remembered across sessions. Use this to store user preferences, facts about their coding style, project decisions, or important context.",
    inputSchema: saveMemorySchema,
  },
  saveMemoryHandler,
);

server.registerTool(
  "search_memory",
  {
    title: "Search Memory",
    description:
      "Search for relevant memories based on a query. Use this to retrieve previously saved preferences, facts, or context that might be helpful for the current conversation.",
    inputSchema: searchMemorySchema,
  },
  searchMemoryHandler,
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("MemContext MCP server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.error("\nShutting down MCP server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("\nShutting down MCP server...");
  process.exit(0);
});
