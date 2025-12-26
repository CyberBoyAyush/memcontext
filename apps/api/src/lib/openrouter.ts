import { OpenRouter } from "@openrouter/sdk";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";
import type { RelationshipClassification } from "@memcontext/types";

const EMBEDDING_MODEL = "openai/text-embedding-3-large";
const LLM_MODEL = "google/gemini-2.5-flash";

function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }
  return apiKey;
}

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
    });
  }
  return openrouterAiSdkInstance;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenRouterSdk().embeddings.generate({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: 1536,
  });

  if (typeof response === "string") {
    throw new Error(
      `Unexpected string response from embeddings API: ${response}`,
    );
  }

  const embedding = response.data[0].embedding;
  if (typeof embedding === "string") {
    throw new Error("Received base64 encoded embedding, expected float array");
  }

  return embedding;
}

const relationshipSchema = z.object({
  classification: z.enum(["update", "extend", "similar"]),
  reason: z.string(),
});

export async function classifyRelationship(
  existingContent: string,
  newContent: string,
): Promise<RelationshipClassification> {
  try {
    const { object } = await generateObject({
      model: getOpenRouterAiSdk().chat(LLM_MODEL),
      schema: relationshipSchema,
      prompt: `You are a memory relationship classifier. Analyze these two memories and classify their relationship.

EXISTING MEMORY:
"${existingContent}"

NEW MEMORY:
"${newContent}"

Classification options:
- "update": The new memory CONTRADICTS or REPLACES the existing memory (e.g., preference changed, fact updated)
- "extend": The new memory ADDS DETAIL or ELABORATES on the existing memory (e.g., more specific info about same topic)
- "similar": The memories are RELATED but are SEPARATE FACTS (e.g., both about coding but different preferences)

Classify this relationship:`,
    });

    return object.classification as RelationshipClassification;
  } catch (error) {
    console.error("LLM classification failed, defaulting to similar:", error);
    return "similar";
  }
}
