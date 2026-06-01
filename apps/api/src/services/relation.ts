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

  const result = timing
    ? await withTiming(timing, "classify_relationship", () =>
        openrouterClassifyMulti(existingMemories, newContent),
      )
    : await openrouterClassifyMulti(existingMemories, newContent);

  // The LLM can return a targetIndex that is out of range, negative, or a
  // non-integer. Drop invalid indices so callers safely fall back instead of
  // dereferencing `undefined` (would throw "Cannot read properties of undefined").
  const targetIndex = result.targetIndex;
  const isValidIndex =
    typeof targetIndex === "number" &&
    Number.isInteger(targetIndex) &&
    targetIndex >= 0 &&
    targetIndex < existingMemories.length;

  if (!isValidIndex && targetIndex !== undefined) {
    logger.warn(
      { targetIndex, existingCount: existingMemories.length, action: result.action },
      "classifier returned out-of-range targetIndex - ignoring",
    );
    return { ...result, targetIndex: undefined };
  }

  return result;
}
