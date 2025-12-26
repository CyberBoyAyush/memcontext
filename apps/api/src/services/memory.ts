import { db, memories, memoryRelations } from "../db/index.js";
import { generateEmbedding, expandMemory } from "./embedding.js";
import { classifyRelationship } from "./relation.js";
import { incrementMemoryCount, decrementMemoryCount } from "./subscription.js";
import { normalizeProjectName } from "../utils/index.js";
import { logger } from "../lib/logger.js";
import { eq, and, isNull, lt, asc, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import type {
  MemoryCategory,
  MemorySource,
  SaveMemoryResponse,
  MemoryWithRelevance,
  SearchMemoryResponse,
} from "@memcontext/types";
import type { TimingContext } from "../utils/timing.js";
import { withTiming } from "../utils/timing.js";

const SIMILARITY_THRESHOLD = 0.3;
const SEARCH_THRESHOLD = 0.5;

interface SaveMemoryParams {
  userId: string;
  content: string;
  category?: MemoryCategory;
  project?: string;
  source: MemorySource;
  timing?: TimingContext;
}

interface SearchMemoriesParams {
  userId: string;
  query: string;
  limit?: number;
  category?: MemoryCategory;
  project?: string;
  timing?: TimingContext;
}

export async function saveMemory(
  params: SaveMemoryParams,
): Promise<SaveMemoryResponse> {
  const { userId, content, category, source, timing } = params;
  const project = normalizeProjectName(params.project);

  const expandedContent = await expandMemory(content, timing);
  const embedding = await generateEmbedding(expandedContent, timing);

  const similarMemory = await (timing
    ? withTiming(timing, "find_similar", () =>
        findSimilarMemory(userId, embedding),
      )
    : findSimilarMemory(userId, embedding));

  if (!similarMemory) {
    const [newMemory] = await (timing
      ? withTiming(timing, "db_insert", async () =>
          db
            .insert(memories)
            .values({
              userId,
              content,
              embedding,
              category,
              project,
              source,
            })
            .returning({ id: memories.id }),
        )
      : db
          .insert(memories)
          .values({
            userId,
            content,
            embedding,
            category,
            project,
            source,
          })
          .returning({ id: memories.id }));

    await incrementMemoryCount(userId);

    logger.info(
      {
        memoryId: newMemory.id,
        userId,
        project,
        contentLength: content.length,
        status: "saved",
      },
      "memory created",
    );

    return {
      id: newMemory.id,
      status: "saved",
    };
  }

  const classification = await classifyRelationship(
    similarMemory.content,
    content,
    timing,
  );

  if (classification === "update") {
    const [newMemory] = await (timing
      ? withTiming(timing, "db_update", async () =>
          db
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
            .returning({ id: memories.id }),
        )
      : db
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
          .returning({ id: memories.id }));

    await db
      .update(memories)
      .set({ isCurrent: false })
      .where(eq(memories.id, similarMemory.id));

    logger.info(
      {
        memoryId: newMemory.id,
        supersededId: similarMemory.id,
        userId,
        project,
        contentLength: content.length,
        status: "updated",
      },
      "memory updated (superseded)",
    );

    return {
      id: newMemory.id,
      status: "updated",
      superseded: similarMemory.id,
    };
  }

  const [newMemory] = await (timing
    ? withTiming(timing, "db_insert_related", async () =>
        db
          .insert(memories)
          .values({
            userId,
            content,
            embedding,
            category,
            project,
            source,
          })
          .returning({ id: memories.id }),
      )
    : db
        .insert(memories)
        .values({
          userId,
          content,
          embedding,
          category,
          project,
          source,
        })
        .returning({ id: memories.id }));

  await db.insert(memoryRelations).values({
    sourceId: newMemory.id,
    targetId: similarMemory.id,
    relationType: classification === "extend" ? "extends" : "similar",
    strength: 1 - similarMemory.distance,
  });

  await incrementMemoryCount(userId);

  const status = classification === "extend" ? "extended" : "saved";

  logger.info(
    {
      memoryId: newMemory.id,
      relatedTo: similarMemory.id,
      relationType: classification === "extend" ? "extends" : "similar",
      userId,
      project,
      contentLength: content.length,
      status,
    },
    `memory ${status}`,
  );

  return {
    id: newMemory.id,
    status,
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
  const start = performance.now();
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

  const duration = Math.round(performance.now() - start);

  if (results.length === 0) {
    logger.debug(
      {
        userId,
        duration,
        found: false,
      },
      "similar memory search completed",
    );
    return null;
  }

  const result = results[0] as SimilarMemoryResult;
  logger.debug(
    {
      userId,
      duration,
      found: true,
      similarityScore: Math.round((1 - result.distance) * 100) / 100,
    },
    "similar memory found",
  );

  return result;
}

export async function searchMemories(
  params: SearchMemoriesParams,
): Promise<SearchMemoryResponse> {
  const { userId, query, limit = 5, category, timing } = params;
  const project = normalizeProjectName(params.project);

  const queryEmbedding = await generateEmbedding(query, timing);

  const searchStart = performance.now();
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

  const results = await (timing
    ? withTiming(timing, "db_search", () =>
        db
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
          .limit(limit),
      )
    : db
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
        .limit(limit));

  const searchDuration = Math.round(performance.now() - searchStart);

  const memoriesWithRelevance: MemoryWithRelevance[] = results.map((row) => ({
    id: row.id,
    content: row.content,
    category: row.category as MemoryCategory | undefined,
    project: row.project ?? undefined,
    relevance: Math.round((1 - (row.distance as number)) * 100) / 100,
    createdAt: row.createdAt,
  }));

  const topScore =
    memoriesWithRelevance.length > 0
      ? memoriesWithRelevance[0].relevance
      : undefined;

  logger.info(
    {
      userId,
      queryLength: query.length,
      project,
      category,
      resultsCount: memoriesWithRelevance.length,
      topScore,
      searchDuration,
    },
    "memory search completed",
  );

  return {
    found: memoriesWithRelevance.length,
    memories: memoriesWithRelevance,
  };
}

export async function deleteMemory(
  userId: string,
  memoryId: string,
): Promise<boolean> {
  const start = performance.now();

  const result = await db
    .update(memories)
    .set({ deletedAt: sql`NOW()` })
    .where(and(eq(memories.id, memoryId), eq(memories.userId, userId)));

  const deleted = (result.rowCount ?? 0) > 0;
  const duration = Math.round(performance.now() - start);

  if (deleted) {
    await decrementMemoryCount(userId);

    logger.info(
      {
        memoryId,
        userId,
        duration,
      },
      "memory deleted",
    );
  } else {
    logger.warn(
      {
        memoryId,
        userId,
        duration,
      },
      "memory delete failed - not found",
    );
  }

  return deleted;
}
