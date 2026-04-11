import { OpenRouter } from "@openrouter/sdk";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
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

export type TemporalCategory =
  | "permanent"
  | "short_term"
  | "medium_term"
  | "long_term";

const TEMPORAL_TTL_DAYS: Record<TemporalCategory, number | null> = {
  permanent: null,
  short_term: 7,
  medium_term: 30,
  long_term: 90,
};

export interface ExpandMemoryResult {
  expandedContent: string;
  temporalCategory: TemporalCategory;
  suggestedTtlDays: number | null;
}

const expandMemorySchema = z.object({
  expandedContent: z.string(),
  temporalCategory: z.enum([
    "permanent",
    "short_term",
    "medium_term",
    "long_term",
  ]),
});

export async function expandMemory(
  content: string,
): Promise<ExpandMemoryResult> {
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const escapedContent = escapeForPrompt(content);

    try {
      const { object } = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: getOpenRouterAiSdk().chat(LLM_MODEL) as any,
        abortSignal: controller.signal,
        schema: expandMemorySchema,
        prompt: `You are a memory processor. Given a user memory, do two things:

1. Rewrite it into a clear, searchable statement with relevant keywords (1-2 sentences).
2. Classify its temporal nature.

Temporal categories:
- "permanent": Stable facts, preferences, decisions, identity. Things that won't change unless explicitly updated.
  Examples: "User prefers TypeScript", "Company is called CarQ", "Chose PostgreSQL for database", "Prefers dark mode"
- "short_term": Events or facts valid for only a few days. Will become irrelevant very soon.
  Examples: "Meeting tomorrow at 3pm", "Sprint ends Friday", "Exam next week", "Deploy scheduled for tonight"
- "medium_term": Current observations, strategies, or trends that change periodically (weeks to a month).
  Examples: "LinkedIn algorithm favors long posts right now", "Currently testing carousel format", "This month focusing on mobile", "New pricing strategy being tested"
- "long_term": Plans, goals, or contexts valid for months but not permanent.
  Examples: "Q2 goal is to reach 10K users", "This year focusing on enterprise", "Migration planned for summer"

IMPORTANT: When in doubt, ALWAYS return "permanent". It is much better to keep a memory too long than to lose it too early. Only classify as temporal when the content clearly contains time-sensitive language.

Memory: "${escapedContent}"`,
      });

      const duration = Math.round(performance.now() - start);
      const category = object.temporalCategory ?? "permanent";

      logger.debug(
        {
          model: LLM_MODEL,
          operation: "expand_memory",
          inputLength: content.length,
          outputLength: object.expandedContent.length,
          temporalCategory: category,
          duration,
        },
        "memory expanded with temporal classification",
      );

      return {
        expandedContent: object.expandedContent.trim() || content,
        temporalCategory: category,
        suggestedTtlDays: TEMPORAL_TTL_DAYS[category],
      };
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
      "memory expansion failed, defaulting to permanent",
    );
    return {
      expandedContent: content,
      temporalCategory: "permanent",
      suggestedTtlDays: null,
    };
  }
}

const queryVariantsSchema = z.object({
  variants: z.array(z.string()).length(3),
});

export async function generateQueryVariants(query: string): Promise<string[]> {
  const start = performance.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const escapedQuery = escapeForPrompt(query);

    try {
      const { object } = await generateObject({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        model: getOpenRouterAiSdk().chat(LLM_MODEL) as any,
        schema: queryVariantsSchema,
        abortSignal: controller.signal,
        prompt: `Generate 3 search query variants to find relevant memories in a personal knowledge base.

Original query: "${escapedQuery}"

Create variants that:
1. Rephrase using different wording while preserving intent
2. Include relevant synonyms, related terms, or technical keywords
3. Approach from a different angle (e.g., if asking about preferences, also try asking about configuration or choices)

The variants should match how memories are stored - as clear statements with keywords and context about preferences, facts, decisions, or configurations.

Examples:
- Original: "authentication preferences"
  Variants: ["What authentication method or API key format does the user prefer?", "User's API security configuration and auth headers", "Authentication and authorization preferences for APIs"]
  
- Original: "testing strategies"
  Variants: ["What testing framework and approach does the user prefer?", "User's preferences for unit tests, integration tests, and test coverage", "Testing tools and methodologies the user likes to use"]

Return exactly 3 variants as a JSON object with a "variants" array.`,
      });

      const duration = Math.round(performance.now() - start);
      logger.debug(
        {
          model: LLM_MODEL,
          operation: "generate_query_variants",
          inputLength: query.length,
          variantCount: object.variants.length,
          duration,
        },
        "query variants generated",
      );

      return object.variants;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    logger.error(
      {
        model: LLM_MODEL,
        operation: "generate_query_variants",
        inputLength: query.length,
        duration,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
      "query variant generation failed, using original query only",
    );
    return [];
  }
}
