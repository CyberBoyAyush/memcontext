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
      "The memory content to save - should be a clear, atomic fact or preference",
    ),
  category: z
    .enum(["preference", "fact", "decision", "context"])
    .optional()
    .describe("Category of the memory: preference, fact, decision, or context"),
  project: z
    .string()
    .optional()
    .describe(
      "Project name. RULES: lowercase, no spaces, no special characters. Examples: 'capychat', 'memcontext'. If user says 'Capy Chat' use 'capychat'.",
    ),
};

const searchMemorySchema = {
  query: z.string().describe("The search query to find relevant memories"),
  limit: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(5)
    .describe("Maximum number of results to return (1-10, default: 5)"),
  category: z
    .enum(["preference", "fact", "decision", "context"])
    .optional()
    .describe("Filter results by category"),
  project: z
    .string()
    .optional()
    .describe(
      "Filter results by project name. RULES: lowercase, no spaces, no special characters.",
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
        "Save a memory after searching confirms it's needed. Use when: " +
        "(1) search found no existing memory on this topic, OR " +
        "(2) search found conflicting info that needs correction. " +
        "The system auto-detects updates vs new entries.",
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
        "Search for relevant memories. ALWAYS call this FIRST - at conversation start to load context, " +
        "and before saving to check if the memory already exists. Only save_memory if search shows " +
        "no match or conflicting information that needs updating.",
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
