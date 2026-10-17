#!/usr/bin/env node
import "./env.js";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createApiClient } from "./lib/api-client.js";
import { registerTools } from "./tools.js";

const apiClient = createApiClient({
  apiBase: process.env.MEMCONTEXT_API_URL || "https://api.memcontext.in",
  apiKey: process.env.MEMCONTEXT_API_KEY || "",
});

// Serves both MCP 2026-07-28 and 2025-era (initialize handshake) clients.
serveStdio(() => {
  const server = new McpServer({ name: "memcontext", version: "1.0.0" });
  registerTools(server, apiClient);
  return server;
});

console.error("MemContext MCP server running on stdio");

process.on("SIGINT", () => {
  console.error("\nShutting down MCP server...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("\nShutting down MCP server...");
  process.exit(0);
});
