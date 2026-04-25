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
  scope: z
    .string()
    .optional()
    .describe(
      "Hard isolation boundary for the memory container. " +
        "Use a stable app-level end-user or tenant ID, such as 'user_123' or 'org_acme_user_42'. " +
        "When provided, MemContext only saves and retrieves within this scope.",
    ),
  project: z
    .string()
    .optional()
    .describe(
      "ONLY for project-specific memories when a clear project/app name is already known. " +
        "OMIT if unsure. Examples: 'memcontext', 'carq'. Avoid vague names like '123' or 'abc'. " +
        "Format: lowercase, no spaces.",
    ),
  validUntil: z
    .string()
    .optional()
    .describe(
      "ISO 8601 UTC datetime when this memory should stop being used. " +
        "Set it only when the expiry/deadline is known exactly. If timing is fuzzy " +
        "('currently', 'for now', 'this quarter'), omit it. MemContext auto-TTL handles those cases.",
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
  scope: z
    .string()
    .optional()
    .describe(
      "Hard isolation boundary for the memory container. " +
        "When provided, search runs only within that scope. Omit to search only unscoped/global memories.",
    ),
  project: z
    .string()
    .optional()
    .describe(
      "OMIT to search all projects within the selected scope. " +
        "ONLY set to filter to a specific project's memories.",
    ),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe(
      "Maximum vector distance from 0 to 1. Higher = broader search and more results. " +
        "Use 0.2-0.4 for strict search, 0.6 by default, and 0.7-0.8 for broader recall.",
    ),
};

type SaveMemoryInput = z.infer<z.ZodObject<typeof saveMemorySchema>>;
type SearchMemoryInput = z.infer<z.ZodObject<typeof searchMemorySchema>>;

function normalizeProject(project: string | undefined): string | undefined {
  if (!project) return undefined;
  return project
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeScope(scope: string | undefined): string | undefined {
  if (!scope) return undefined;
  const normalized = scope.trim();
  return normalized.length > 0 ? normalized : undefined;
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
        "The system handles duplicates and updates automatically — re-saving an already-known fact is safe, the system deduplicates automatically.",
      inputSchema: saveMemorySchema,
    },
    async (args: SaveMemoryInput) => {
      try {
        const response = await apiClient.post<SaveMemoryResponse>(
          "/api/memories",
          {
            content: args.content,
            category: args.category,
            scope: normalizeScope(args.scope),
            project: normalizeProject(args.project),
            source: "mcp",
            validUntil: args.validUntil,
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
        "Prefer searching over assuming — it is faster than making wrong assumptions. " +
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
            scope: normalizeScope(args.scope),
            project: normalizeProject(args.project),
            threshold: args.threshold,
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
              }${
                m.scope ? ` [scope:${m.scope}]` : ""
              }${m.project ? ` [${m.project}]` : ""} [id: ${m.id}]`,
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

  server.registerTool(
    "memory_feedback",
    {
      title: "Memory Feedback",
      description:
        "Rate a memory as helpful or not helpful to improve future retrieval quality. " +
        "Use after search results when a memory was particularly useful, irrelevant, outdated, or wrong.",
      inputSchema: {
        memoryId: z
          .string()
          .describe(
            "The memory ID to rate. Use the ID returned by search_memory.",
          ),
        scope: z
          .string()
          .optional()
          .describe(
            "Hard isolation boundary for the memory container. " +
              "Provide the same scope that was used when the memory was retrieved.",
          ),
        type: z
          .enum(["helpful", "not_helpful", "outdated", "wrong"])
          .describe("Type of feedback for the memory."),
        context: z
          .string()
          .optional()
          .describe(
            "Optional context explaining why this feedback is being submitted.",
          ),
      },
    },
    async (args) => {
      try {
        const scope = normalizeScope(args.scope);
        const feedbackPath = scope
          ? `/api/memories/${args.memoryId}/feedback?scope=${encodeURIComponent(
              scope,
            )}`
          : `/api/memories/${args.memoryId}/feedback`;

        await apiClient.post(feedbackPath, {
          type: args.type,
          context: args.context,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: "Feedback recorded successfully.",
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
              text: `Error submitting feedback: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "delete_memory",
    {
      title: "Delete Memory",
      description:
        "Soft-delete a specific memory by ID. Use when a memory was saved incorrectly or the user explicitly asks to remove it from future retrieval.",
      inputSchema: {
        memoryId: z
          .string()
          .describe(
            "The memory ID to delete. Use the ID returned by search_memory.",
          ),
        scope: z
          .string()
          .optional()
          .describe(
            "Hard isolation boundary for the memory container. " +
              "Provide the same scope that was used when the memory was retrieved.",
          ),
      },
    },
    async (args) => {
      try {
        const scope = normalizeScope(args.scope);
        const deletePath = scope
          ? `/api/memories/${args.memoryId}?scope=${encodeURIComponent(
              scope,
            )}`
          : `/api/memories/${args.memoryId}`;

        await apiClient.delete(deletePath);

        return {
          content: [
            {
              type: "text" as const,
              text: "Memory deleted successfully.",
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
              text: `Error deleting memory: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
