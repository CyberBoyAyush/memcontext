import { z } from "zod";
import { get } from "../lib/api-client.js";
import type { SearchMemoryResponse } from "@memcontext/types";

export const searchMemorySchema = {
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

export type SearchMemoryInput = z.infer<z.ZodObject<typeof searchMemorySchema>>;

function normalizeProject(project: string | undefined): string | undefined {
  if (!project) return undefined;
  return project
    .toLowerCase()
    .replace(/[\s\-_]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function searchMemoryHandler(
  args: SearchMemoryInput,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const response = await get<SearchMemoryResponse>("/api/memories/search", {
      query: args.query,
      limit: args.limit,
      category: args.category,
      project: normalizeProject(args.project),
    });

    if (response.found === 0) {
      return {
        content: [
          {
            type: "text",
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
          type: "text",
          text: `Found ${response.found} relevant memories:\n\n${formattedMemories}`,
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `Error searching memories: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
