import { db, memories, memoryRelations } from "../db/index.js";
import {
  generateEmbedding,
  expandMemory,
  expandQueryForSearch,
} from "./embedding.js";
import {
  classifyWithSimilarMemories,
  type SimilarMemoryForClassification,
} from "./relation.js";
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
const SEARCH_THRESHOLD = 0.4;
const SIMILAR_MEMORIES_LIMIT = 5;

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

  const similarMemories = await (timing
    ? withTiming(timing, "find_similar", () =>
        findSimilarMemories(userId, embedding),
      )
    : findSimilarMemories(userId, embedding));

  if (similarMemories.length === 0) {
    const newMemoryId = await (timing
      ? withTiming(timing, "db_insert", async () =>
          db.transaction(async (tx) => {
            const [newMemory] = await tx
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
            await incrementMemoryCount(userId, tx);
            return newMemory.id;
          }),
        )
      : db.transaction(async (tx) => {
          const [newMemory] = await tx
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
          await incrementMemoryCount(userId, tx);
          return newMemory.id;
        }));

    logger.info(
      {
        memoryId: newMemoryId,
        userId,
        project,
        contentLength: content.length,
        status: "saved",
      },
      "memory created",
    );

    return {
      id: newMemoryId,
      status: "saved",
    };
  }

  const memoriesForClassification: SimilarMemoryForClassification[] =
    similarMemories.map((m, idx) => ({
      index: idx,
      content: m.content,
    }));

  const classification = await classifyWithSimilarMemories(
    memoriesForClassification,
    content,
    timing,
  );

  if (classification.action === "noop") {
    const targetMemory =
      classification.targetIndex !== undefined
        ? similarMemories[classification.targetIndex]
        : similarMemories[0];

    logger.info(
      {
        existingMemoryId: targetMemory.id,
        userId,
        project,
        contentLength: content.length,
        status: "duplicate",
        reason: classification.reason,
      },
      "memory skipped (already exists)",
    );

    return {
      id: targetMemory.id,
      status: "duplicate",
      existingId: targetMemory.id,
    };
  }

  const targetMemory =
    classification.targetIndex !== undefined
      ? similarMemories[classification.targetIndex]
      : similarMemories[0];

  if (classification.action === "update") {
    const newMemoryId = await (timing
      ? withTiming(timing, "db_update", async () =>
          db.transaction(async (tx) => {
            const [newMemory] = await tx
              .insert(memories)
              .values({
                userId,
                content,
                embedding,
                category: category ?? targetMemory.category,
                project: project ?? targetMemory.project,
                source,
                supersedesId: targetMemory.id,
                rootId: targetMemory.rootId ?? targetMemory.id,
                version: targetMemory.version + 1,
              })
              .returning({ id: memories.id });
            await tx
              .update(memories)
              .set({ isCurrent: false })
              .where(eq(memories.id, targetMemory.id));
            return newMemory.id;
          }),
        )
      : db.transaction(async (tx) => {
          const [newMemory] = await tx
            .insert(memories)
            .values({
              userId,
              content,
              embedding,
              category: category ?? targetMemory.category,
              project: project ?? targetMemory.project,
              source,
              supersedesId: targetMemory.id,
              rootId: targetMemory.rootId ?? targetMemory.id,
              version: targetMemory.version + 1,
            })
            .returning({ id: memories.id });
          await tx
            .update(memories)
            .set({ isCurrent: false })
            .where(eq(memories.id, targetMemory.id));
          return newMemory.id;
        }));

    logger.info(
      {
        memoryId: newMemoryId,
        supersededId: targetMemory.id,
        userId,
        project,
        contentLength: content.length,
        status: "updated",
        reason: classification.reason,
      },
      "memory updated (superseded)",
    );

    return {
      id: newMemoryId,
      status: "updated",
      superseded: targetMemory.id,
    };
  }

  const relationType =
    classification.action === "extend" ? "extends" : "similar";
  const status = classification.action === "extend" ? "extended" : "saved";

  const newMemoryId = await (timing
    ? withTiming(timing, "db_insert_related", async () =>
        db.transaction(async (tx) => {
          const [newMemory] = await tx
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
          await tx.insert(memoryRelations).values({
            sourceId: newMemory.id,
            targetId: targetMemory.id,
            relationType,
            strength: 1 - targetMemory.distance,
          });
          await incrementMemoryCount(userId, tx);
          return newMemory.id;
        }),
      )
    : db.transaction(async (tx) => {
        const [newMemory] = await tx
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
        await tx.insert(memoryRelations).values({
          sourceId: newMemory.id,
          targetId: targetMemory.id,
          relationType,
          strength: 1 - targetMemory.distance,
        });
        await incrementMemoryCount(userId, tx);
        return newMemory.id;
      }));

  logger.info(
    {
      memoryId: newMemoryId,
      relatedTo: targetMemory.id,
      relationType,
      userId,
      project,
      contentLength: content.length,
      status,
      reason: classification.reason,
    },
    `memory ${status}`,
  );

  return {
    id: newMemoryId,
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

async function findSimilarMemories(
  userId: string,
  embedding: number[],
): Promise<SimilarMemoryResult[]> {
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
    .limit(SIMILAR_MEMORIES_LIMIT);

  const duration = Math.round(performance.now() - start);

  logger.debug(
    {
      userId,
      duration,
      found: results.length,
      topSimilarity:
        results.length > 0
          ? Math.round((1 - (results[0].distance as number)) * 100) / 100
          : undefined,
    },
    "similar memories search completed",
  );

  return results as SimilarMemoryResult[];
}

export async function searchMemories(
  params: SearchMemoriesParams,
): Promise<SearchMemoryResponse> {
  const { userId, query, limit = 5, category, timing } = params;
  const project = normalizeProjectName(params.project);

  const expandedQuery = await expandQueryForSearch(query, timing);
  const queryEmbedding = await generateEmbedding(expandedQuery, timing);

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
      expandedQueryLength: expandedQuery.length,
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

  const deleted = await db.transaction(async (tx) => {
    const result = await tx
      .update(memories)
      .set({ deletedAt: sql`NOW()` })
      .where(
        and(
          eq(memories.id, memoryId),
          eq(memories.userId, userId),
          isNull(memories.deletedAt),
        ),
      );

    const wasDeleted = (result.rowCount ?? 0) > 0;

    if (wasDeleted) {
      await decrementMemoryCount(userId, tx);
    }

    return wasDeleted;
  });

  const duration = Math.round(performance.now() - start);

  if (deleted) {
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
