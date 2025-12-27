import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiClient } from "./lib/api-client.js";
import type {
  SaveMemoryResponse,
  SearchMemoryResponse,
} from "@memcontext/types";

const saveMemorySchema = {
  content: z
    .string()
    .describe(
      "Clear, atomic memory to save. Good: 'User prefers TypeScript over JavaScript'. " +
        "Bad: 'User likes coding' (too vague).",
    ),
  category: z
    .enum(["preference", "fact", "decision", "context"])
    .optional()
    .describe(
      "preference: user likes/dislikes (e.g., 'prefers dark mode'). " +
        "fact: objective info (e.g., 'uses MacOS'). " +
        "decision: choices made (e.g., 'chose PostgreSQL for DB'). " +
        "context: background info (e.g., 'working on e-commerce app').",
    ),
  project: z
    .string()
    .optional()
    .describe(
      "ONLY for project-specific memories (e.g., 'this project uses PNPM'). " +
        "OMIT for general preferences (e.g., 'prefers Bun', 'likes dark mode'). " +
        "Format: lowercase, no spaces. Example: 'memcontext', 'capychat'.",
    ),
};

const searchMemorySchema = {
  query: z
    .string()
    .describe(
      "Natural language search query. Examples: 'package manager preference', " +
        "'coding style', 'database choices'.",
    ),
  limit: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe(
      "Number of results (1-10, default: 5). Use higher for broad topics.",
    ),
  category: z
    .enum(["preference", "fact", "decision", "context"])
    .optional()
    .describe("Filter by type. OMIT to search all categories."),
  project: z
    .string()
    .optional()
    .describe(
      "OMIT to search ALL memories (recommended for most searches). " +
        "ONLY set to filter to a specific project's memories.",
    ),
};

type SaveMemoryInput = z.infer<z.ZodObject<typeof saveMemorySchema>>;
type SearchMemoryInput = z.infer<z.ZodObject<typeof searchMemorySchema>>;

function normalizeProject(project: string | undefined): string | undefined {
  if (!project) return undefined;
  return project
    .toLowerCase()
    .replace(/[\s\-_]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function registerTools(server: McpServer, apiClient: ApiClient): void {
  server.registerTool(
    "save_memory",
    {
      title: "Save Memory",
      description:
        "Save a memory AFTER search_memory confirms it's needed. " +
        "Use when: (1) no existing memory on this topic, OR (2) existing memory has outdated/conflicting info. " +
        "System auto-handles updates - just save the new/corrected info.",
      inputSchema: saveMemorySchema,
    },
    async (args: SaveMemoryInput) => {
      try {
        const response = await apiClient.post<SaveMemoryResponse>(
          "/api/memories",
          {
            content: args.content,
            category: args.category,
            project: normalizeProject(args.project),
            source: "mcp",
          },
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error saving memory: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "search_memory",
    {
      title: "Search Memory",
      description:
        "ALWAYS call FIRST. Use at: (1) conversation start to load user context, " +
        "(2) before saving to check for existing memories. " +
        "Only use save_memory if search returns no match OR outdated info needing correction.",
      inputSchema: searchMemorySchema,
    },
    async (args: SearchMemoryInput) => {
      try {
        const response = await apiClient.get<SearchMemoryResponse>(
          "/api/memories/search",
          {
            query: args.query,
            limit: args.limit,
            category: args.category,
            project: normalizeProject(args.project),
          },
        );

        if (response.found === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No relevant memories found for this query.",
              },
            ],
          };
        }

        const formattedMemories = response.memories
          .map(
            (m, i) =>
              `${i + 1}. [${(m.relevance * 100).toFixed(0)}% match] ${m.content}${
                m.category ? ` (${m.category})` : ""
              }${m.project ? ` [${m.project}]` : ""}`,
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${response.found} relevant memories:\n\n${formattedMemories}`,
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching memories: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
