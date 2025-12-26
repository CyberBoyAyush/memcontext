import { generateEmbedding as openrouterGenerateEmbedding } from "../lib/openrouter.js";

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  return openrouterGenerateEmbedding(text);
}
