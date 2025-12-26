import { z } from "zod";
import { post } from "../lib/api-client.js";
import type { SaveMemoryResponse } from "@memcontext/types";

export const saveMemorySchema = {
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

export type SaveMemoryInput = z.infer<z.ZodObject<typeof saveMemorySchema>>;

function normalizeProject(project: string | undefined): string | undefined {
  if (!project) return undefined;
  return project
    .toLowerCase()
    .replace(/[\s\-_]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function saveMemoryHandler(
  args: SaveMemoryInput,
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    const response = await post<SaveMemoryResponse>("/api/memories", {
      content: args.content,
      category: args.category,
      project: normalizeProject(args.project),
      source: "mcp",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `Error saving memory: ${message}`,
        },
      ],
      isError: true,
    };
  }
}
