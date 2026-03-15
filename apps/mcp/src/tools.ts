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
      "Clear, atomic memory to save. Write as a complete, searchable statement. " +
        "Good: 'User prefers TypeScript over JavaScript for type safety'. " +
        "Bad: 'User likes coding' (too vague), 'TS > JS' (not searchable).",
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
      "Natural language description of what to find - use complete sentences, not keywords. " +
        "Good: 'What package manager does the user prefer?', 'How should database transactions be handled?'. " +
        "Bad: 'package manager', 'db transactions' (keywords reduce match quality).",
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
        "You MUST call this tool to persist durable user or project information across sessions — " +
        "do not rely on any other method to remember things. " +
        "Save IMMEDIATELY when: " +
        "(1) User shares a stable preference, like, or dislike. " +
        "(2) User corrects your approach or tells you how they want things done. " +
        "(3) A technology, architecture, or design decision is finalized. " +
        "(4) User says 'remember', 'save this', 'note this', or similar. " +
        "(5) A durable project fact is learned (stack, structure, naming conventions). " +
        "(6) A project convention or reusable pattern is established. " +
        "Do not defer or batch saves — save the moment the trigger occurs. " +
        "Do not save ephemeral task state, one-off debug info, or trivial details with no future value. " +
        "The system handles duplicates and updates automatically — re-saving an already-known fact is safe and will not create duplicates.",
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
        "You MUST call this tool FIRST before your first response in every conversation — do not skip. " +
        "Search to load user preferences, project context, and past decisions before responding. " +
        "Also search when: " +
        "(1) You are about to make a meaningful decision — check if a past decision already exists. " +
        "(2) You are about to assume user preferences, tools, stack, or workflow — search instead of assuming. " +
        "(3) You need context about a project's conventions, patterns, or history. " +
        "(4) The user references past context ('do you remember', 'what did we decide', 'last time'). " +
        "Searching is lightweight and fast — prefer searching over assuming. " +
        "If no results are found, proceed normally.",
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
