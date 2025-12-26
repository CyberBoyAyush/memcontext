import {
  generateEmbedding as openrouterGenerateEmbedding,
  expandMemory as openrouterExpandMemory,
} from "../lib/openrouter.js";

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  return openrouterGenerateEmbedding(text);
}

export async function expandMemory(content: string): Promise<string> {
  if (!content || content.trim().length === 0) {
    return content;
  }

  return openrouterExpandMemory(content);
}
