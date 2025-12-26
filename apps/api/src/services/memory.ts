import { db, memories, memoryRelations } from "../db/index.js";
import { generateEmbedding } from "./embedding.js";
import { classifyRelationship } from "./relation.js";
import { normalizeProjectName } from "../utils/index.js";
import { eq, and, isNull, lt, asc, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import type {
  MemoryCategory,
  MemorySource,
  SaveMemoryResponse,
  MemoryWithRelevance,
  SearchMemoryResponse,
} from "@memcontext/types";

const SIMILARITY_THRESHOLD = 0.3;
const SEARCH_THRESHOLD = 0.5;

interface SaveMemoryParams {
  userId: string;
  content: string;
  category?: MemoryCategory;
  project?: string;
  source: MemorySource;
}

interface SearchMemoriesParams {
  userId: string;
  query: string;
  limit?: number;
  category?: MemoryCategory;
  project?: string;
}

export async function saveMemory(
  params: SaveMemoryParams,
): Promise<SaveMemoryResponse> {
  const { userId, content, category, source } = params;
  const project = normalizeProjectName(params.project);

  const embedding = await generateEmbedding(content);

  const similarMemory = await findSimilarMemory(userId, embedding);

  if (!similarMemory) {
    const [newMemory] = await db
      .insert(memories)
      .values({
        userId,
        content,
        embedding,
        category,
        project,
        source,
      })
      .returning({ id: memories.id });

    return {
      id: newMemory.id,
      status: "saved",
    };
  }

  const classification = await classifyRelationship(
    similarMemory.content,
    content,
  );

  if (classification === "update") {
    const [newMemory] = await db
      .insert(memories)
      .values({
        userId,
        content,
        embedding,
        category: category ?? similarMemory.category,
        project: project ?? similarMemory.project,
        source,
        supersedesId: similarMemory.id,
        rootId: similarMemory.rootId ?? similarMemory.id,
        version: similarMemory.version + 1,
      })
      .returning({ id: memories.id });

    await db
      .update(memories)
      .set({ isCurrent: false })
      .where(eq(memories.id, similarMemory.id));

    return {
      id: newMemory.id,
      status: "updated",
      superseded: similarMemory.id,
    };
  }

  const [newMemory] = await db
    .insert(memories)
    .values({
      userId,
      content,
      embedding,
      category,
      project,
      source,
    })
    .returning({ id: memories.id });

  await db.insert(memoryRelations).values({
    sourceId: newMemory.id,
    targetId: similarMemory.id,
    relationType: classification === "extend" ? "extends" : "similar",
    strength: 1 - similarMemory.distance,
  });

  return {
    id: newMemory.id,
    status: classification === "extend" ? "extended" : "saved",
  };
}

interface SimilarMemoryResult {
  id: string;
  content: string;
  category: string | null;
  project: string | null;
  rootId: string | null;
  version: number;
  distance: number;
}

async function findSimilarMemory(
  userId: string,
  embedding: number[],
): Promise<SimilarMemoryResult | null> {
  const distance = cosineDistance(memories.embedding, embedding);

  const results = await db
    .select({
      id: memories.id,
      content: memories.content,
      category: memories.category,
      project: memories.project,
      rootId: memories.rootId,
      version: memories.version,
      distance,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
        lt(distance, SIMILARITY_THRESHOLD),
      ),
    )
    .orderBy(asc(distance))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  return results[0] as SimilarMemoryResult;
}

export async function searchMemories(
  params: SearchMemoriesParams,
): Promise<SearchMemoryResponse> {
  const { userId, query, limit = 5, category } = params;
  const project = normalizeProjectName(params.project);

  const queryEmbedding = await generateEmbedding(query);

  const distance = cosineDistance(memories.embedding, queryEmbedding);

  const conditions = [
    eq(memories.userId, userId),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    lt(distance, SEARCH_THRESHOLD),
  ];

  if (category) {
    conditions.push(eq(memories.category, category));
  }

  if (project) {
    conditions.push(eq(memories.project, project));
  }

  const results = await db
    .select({
      id: memories.id,
      content: memories.content,
      category: memories.category,
      project: memories.project,
      createdAt: memories.createdAt,
      distance,
    })
    .from(memories)
    .where(and(...conditions))
    .orderBy(asc(distance))
    .limit(limit);

  const memoriesWithRelevance: MemoryWithRelevance[] = results.map((row) => ({
    id: row.id,
    content: row.content,
    category: row.category as MemoryCategory | undefined,
    project: row.project ?? undefined,
    relevance: Math.round((1 - (row.distance as number)) * 100) / 100,
    createdAt: row.createdAt,
  }));

  return {
    found: memoriesWithRelevance.length,
    memories: memoriesWithRelevance,
  };
}

export async function deleteMemory(
  userId: string,
  memoryId: string,
): Promise<boolean> {
  const result = await db
    .update(memories)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)));

  return (result.rowCount ?? 0) > 0;
}
