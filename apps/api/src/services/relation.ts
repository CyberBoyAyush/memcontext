import { classifyRelationship as openrouterClassify } from "../lib/openrouter.js";
import { logger } from "../lib/logger.js";
import type { RelationshipClassification } from "@memcontext/types";
import type { TimingContext } from "../utils/timing.js";
import { withTiming } from "../utils/timing.js";

export async function classifyRelationship(
  existingContent: string,
  newContent: string,
  timing?: TimingContext,
): Promise<RelationshipClassification> {
  if (!existingContent || !newContent) {
    logger.debug("skipping classification - empty content");
    return "similar";
  }

  if (timing) {
    return withTiming(timing, "classify_relationship", () =>
      openrouterClassify(existingContent, newContent),
    );
  }

  return openrouterClassify(existingContent, newContent);
}
