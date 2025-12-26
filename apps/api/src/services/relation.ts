import { classifyRelationship as openrouterClassify } from "../lib/openrouter.js";
import type { RelationshipClassification } from "@memcontext/types";

export async function classifyRelationship(
  existingContent: string,
  newContent: string,
): Promise<RelationshipClassification> {
  if (!existingContent || !newContent) {
    return "similar";
  }

  return openrouterClassify(existingContent, newContent);
}
