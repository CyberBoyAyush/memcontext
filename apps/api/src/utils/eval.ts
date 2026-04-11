import { searchMemories } from "../services/memory.js";

export type EvalQueryCategory =
  | "semantic"
  | "entity"
  | "mixed"
  | "temporal"
  | "negation";

export interface EvalQuery {
  query: string;
  category: EvalQueryCategory;
  expectedMemoryIds: string[];
  limit?: number;
  project?: string;
}

export interface EvalResult {
  query: string;
  category: EvalQueryCategory;
  precisionAtK: number;
  recallAtK: number;
  returnedIds: string[];
  relevantReturnedIds: string[];
}

export async function runEvaluation(params: {
  userId: string;
  queries: EvalQuery[];
  defaultLimit?: number;
  threshold?: number;
}): Promise<EvalResult[]> {
  const { userId, queries, defaultLimit = 5, threshold } = params;
  const results: EvalResult[] = [];

  for (const query of queries) {
    const limit = query.limit ?? defaultLimit;
    const searchResult = await searchMemories({
      userId,
      query: query.query,
      limit,
      project: query.project,
      threshold,
    });

    const returnedIds = searchResult.memories.map((memory) => memory.id);
    const relevantReturnedIds = returnedIds.filter((id) =>
      query.expectedMemoryIds.includes(id),
    );

    results.push({
      query: query.query,
      category: query.category,
      precisionAtK: limit > 0 ? relevantReturnedIds.length / limit : 0,
      recallAtK:
        query.expectedMemoryIds.length > 0
          ? relevantReturnedIds.length / query.expectedMemoryIds.length
          : 0,
      returnedIds,
      relevantReturnedIds,
    });
  }

  return results;
}
