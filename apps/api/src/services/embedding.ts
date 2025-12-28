import {
  generateEmbedding as openrouterGenerateEmbedding,
  expandMemory as openrouterExpandMemory,
  generateQueryVariants as openrouterGenerateQueryVariants,
} from "../lib/openrouter.js";
import { logger } from "../lib/logger.js";
import type { TimingContext } from "../utils/timing.js";
import { withTiming } from "../utils/timing.js";

export async function generateEmbedding(
  text: string,
  timing?: TimingContext,
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    logger.warn("attempted to generate embedding for empty text");
    throw new Error("Cannot generate embedding for empty text");
  }

  if (timing) {
    return withTiming(timing, "embedding", () =>
      openrouterGenerateEmbedding(text),
    );
  }

  return openrouterGenerateEmbedding(text);
}

export async function expandMemory(
  content: string,
  timing?: TimingContext,
): Promise<string> {
  if (!content || content.trim().length === 0) {
    return content;
  }

  if (timing) {
    return withTiming(timing, "expand_memory", () =>
      openrouterExpandMemory(content),
    );
  }

  return openrouterExpandMemory(content);
}

export async function generateQueryVariants(
  query: string,
  timing?: TimingContext,
): Promise<string[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  if (timing) {
    return withTiming(timing, "generate_variants", () =>
      openrouterGenerateQueryVariants(query),
    );
  }

  return openrouterGenerateQueryVariants(query);
}
