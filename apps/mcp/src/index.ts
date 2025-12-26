#!/usr/bin/env node
import "./env.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createApiClient } from "./lib/api-client.js";
import { registerTools } from "./tools.js";

const server = new McpServer({
  name: "memcontext",
  version: "1.0.0",
});

const apiClient = createApiClient({
  apiBase: process.env.MEMCONTEXT_API_URL || "http://localhost:3000",
  apiKey: process.env.MEMCONTEXT_API_KEY || "",
});

registerTools(server, apiClient);

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
