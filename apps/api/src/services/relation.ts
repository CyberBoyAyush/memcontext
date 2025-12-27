import {
  classifyWithMultipleMemories as openrouterClassifyMulti,
  type SimilarMemoryForClassification,
  type ClassificationResult,
} from "../lib/openrouter.js";
import { logger } from "../lib/logger.js";
import type { TimingContext } from "../utils/timing.js";
import { withTiming } from "../utils/timing.js";

export type { SimilarMemoryForClassification, ClassificationResult };

export async function classifyWithSimilarMemories(
  existingMemories: SimilarMemoryForClassification[],
  newContent: string,
  timing?: TimingContext,
): Promise<ClassificationResult> {
  if (!newContent || existingMemories.length === 0) {
    logger.debug(
      "skipping classification - empty content or no existing memories",
    );
    return { action: "similar", reason: "No existing memories to compare" };
  }

  if (timing) {
    return withTiming(timing, "classify_relationship", () =>
      openrouterClassifyMulti(existingMemories, newContent),
    );
  }

  return openrouterClassifyMulti(existingMemories, newContent);
}
