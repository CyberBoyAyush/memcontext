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

const relationshipSchema = z.object({
  classification: z.enum(["update", "extend", "similar"]),
  reason: z.string(),
});

export async function classifyRelationship(
  existingContent: string,
  newContent: string,
): Promise<RelationshipClassification> {
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const escapedExisting = escapeForPrompt(existingContent);
    const escapedNew = escapeForPrompt(newContent);

    try {
      const { object } = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: getOpenRouterAiSdk().chat(LLM_MODEL) as any,
        schema: relationshipSchema,
        abortSignal: controller.signal,
        prompt: `You are a memory relationship classifier. Analyze these two memories and classify their relationship.

EXISTING MEMORY:
"${escapedExisting}"

NEW MEMORY:
"${escapedNew}"

Classification options:
- "update": The new memory CONTRADICTS or REPLACES the existing memory (e.g., preference changed, fact updated)
- "extend": The new memory ADDS DETAIL or ELABORATES on the existing memory (e.g., more specific info about same topic)
- "similar": The memories are RELATED but are SEPARATE FACTS (e.g., both about coding but different preferences)

Classify this relationship:`,
      });

      const duration = Math.round(performance.now() - start);
      logger.debug(
        {
          model: LLM_MODEL,
          operation: "classify_relationship",
          classification: object.classification,
          duration,
        },
        "relationship classified",
      );

      return object.classification as RelationshipClassification;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        model: LLM_MODEL,
        operation: "classify_relationship",
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "relationship classification failed",
    );
    return "similar";
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
