import { OpenRouter } from "@openrouter/sdk";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { RelationshipClassification } from "@memcontext/types";
import { escapeForPrompt } from "../utils/app-error.js";
import { logger } from "./logger.js";

const EMBEDDING_MODEL = "openai/text-embedding-3-large";
const LLM_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }
  return apiKey;
}

const APP_REFERER = "https://memcontext.in";
const APP_TITLE = "MemContext";

const APP_HEADERS = {
  "HTTP-Referer": APP_REFERER,
  "X-Title": APP_TITLE,
};

let openRouterSdkInstance: OpenRouter | null = null;
let openrouterAiSdkInstance: ReturnType<typeof createOpenRouter> | null = null;

function getOpenRouterSdk(): OpenRouter {
  if (!openRouterSdkInstance) {
    openRouterSdkInstance = new OpenRouter({
      apiKey: getApiKey(),
    });
  }
  return openRouterSdkInstance;
}

function getOpenRouterAiSdk(): ReturnType<typeof createOpenRouter> {
  if (!openrouterAiSdkInstance) {
    openrouterAiSdkInstance = createOpenRouter({
      apiKey: getApiKey(),
      headers: {
        "HTTP-Referer": APP_REFERER,
        "X-Title": APP_TITLE,
      },
    });
  }
  return openrouterAiSdkInstance;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await getOpenRouterSdk().embeddings.generate(
      {
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: 1536,
      },
      {
        signal: controller.signal,
        headers: APP_HEADERS,
      },
    );

    if (typeof response === "string") {
      throw new Error(
        `Unexpected string response from embeddings API: ${response}`,
      );
    }

    const embedding = response.data[0].embedding;
    if (typeof embedding === "string") {
      throw new Error(
        "Received base64 encoded embedding, expected float array",
      );
    }

    const duration = Math.round(performance.now() - start);
    logger.debug(
      {
        model: EMBEDDING_MODEL,
        inputLength: text.length,
        duration,
      },
      "embedding generated",
    );

    return embedding;
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        model: EMBEDDING_MODEL,
        inputLength: text.length,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "embedding generation failed",
    );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export interface SimilarMemoryForClassification {
  index: number;
  content: string;
}

export interface ClassificationResult {
  action: RelationshipClassification;
  targetIndex?: number;
  reason: string;
}

const multiMemoryClassificationSchema = z.object({
  action: z.enum(["update", "extend", "similar", "noop"]),
  targetIndex: z.number().optional(),
  reason: z.string(),
});

export async function classifyWithMultipleMemories(
  existingMemories: SimilarMemoryForClassification[],
  newContent: string,
): Promise<ClassificationResult> {
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const escapedNew = escapeForPrompt(newContent);
    const memoriesText = existingMemories
      .map((m) => `[${m.index}] "${escapeForPrompt(m.content)}"`)
      .join("\n");

    try {
      const { object } = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: getOpenRouterAiSdk().chat(LLM_MODEL) as any,
        schema: multiMemoryClassificationSchema,
        abortSignal: controller.signal,
        prompt: `You are a memory relationship classifier. Analyze the existing memories and determine how to handle the new memory.

EXISTING MEMORIES:
${memoriesText}

NEW MEMORY:
"${escapedNew}"

Classification options:
- "update": The new memory CONTRADICTS or REPLACES an existing memory (e.g., preference changed, fact updated). Set targetIndex to the memory being replaced.
- "extend": The new memory ADDS DETAIL or ELABORATES on an existing memory (e.g., more specific info about same topic). Set targetIndex to the memory being extended.
- "similar": The new memory is RELATED to existing memories but represents a SEPARATE FACT worth saving (e.g., different preference on same topic area).
- "noop": The new memory is ALREADY CAPTURED by an existing memory - it's redundant, a duplicate, or a less specific version of what exists. DO NOT SAVE. Set targetIndex to the memory that already covers this.

Important: Choose "noop" when the new memory doesn't add any new information. Choose "similar" only when it's genuinely new information worth keeping.

Classify this relationship:`,
      });

      const duration = Math.round(performance.now() - start);
      logger.debug(
        {
          model: LLM_MODEL,
          operation: "classify_multi_memory",
          action: object.action,
          targetIndex: object.targetIndex,
          existingCount: existingMemories.length,
          duration,
        },
        "multi-memory classification completed",
      );

      return {
        action: object.action as RelationshipClassification,
        targetIndex: object.targetIndex,
        reason: object.reason,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        model: LLM_MODEL,
        operation: "classify_multi_memory",
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "multi-memory classification failed",
    );
    return {
      action: "similar",
      reason: "Classification failed, defaulting to similar",
    };
  }
}

export async function expandMemory(content: string): Promise<string> {
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const escapedContent = escapeForPrompt(content);

    try {
      const { text } = await generateText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: getOpenRouterAiSdk().chat(LLM_MODEL) as any,
        abortSignal: controller.signal,
        prompt: `Rewrite this user memory into a clear, searchable statement. Include relevant keywords and context that an AI agent might search for. Be specific about what type of preference, fact, or decision this represents. Keep it concise (1-2 sentences).

Memory: "${escapedContent}"

Expanded version:`,
      });

      const duration = Math.round(performance.now() - start);
      logger.debug(
        {
          model: LLM_MODEL,
          operation: "expand_memory",
          inputLength: content.length,
          outputLength: text.length,
          duration,
        },
        "memory expanded",
      );

      return text.trim() || content;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        model: LLM_MODEL,
        operation: "expand_memory",
        inputLength: content.length,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "memory expansion failed",
    );
    return content;
  }
}

export async function expandQueryForSearch(query: string): Promise<string> {
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const escapedQuery = escapeForPrompt(query);

    try {
      const { text } = await generateText({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: getOpenRouterAiSdk().chat(LLM_MODEL) as any,
        abortSignal: controller.signal,
        prompt: `Given this search query for a user's personal memory system:
"${escapedQuery}"

Rewrite this as a more specific, keyword-rich search query that would match stored memories about user preferences, facts, decisions, or context. Convert indirect questions like "user's preferences about X" into direct queries like "what X is used". Add relevant synonyms and related concepts. Keep it under 50 words.

Expanded query:`,
      });

      const duration = Math.round(performance.now() - start);
      logger.debug(
        {
          model: LLM_MODEL,
          operation: "expand_query",
          inputLength: query.length,
          outputLength: text.length,
          duration,
        },
        "query expanded for search",
      );

      return text.trim() || query;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        model: LLM_MODEL,
        operation: "expand_query",
        inputLength: query.length,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "query expansion failed",
    );
    return query;
  }
}
