import { db, memories, memoryRelations } from "../db/index.js";
import {
  generateEmbedding,
  expandMemory,
  generateQueryVariants,
} from "./embedding.js";
import {
  classifyWithSimilarMemories,
  type SimilarMemoryForClassification,
} from "./relation.js";
import { incrementMemoryCount, decrementMemoryCount } from "./subscription.js";
import { normalizeProjectName } from "../utils/index.js";
import { logger } from "../lib/logger.js";
import { eq, and, isNull, lt, asc, desc, sql, ne } from "drizzle-orm";
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
const SEARCH_THRESHOLD = 0.6;
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

export async function findSimilarMemories(
  userId: string,
  embedding: number[],
  excludeId?: string,
): Promise<SimilarMemoryResult[]> {
  const start = performance.now();
  const distance = cosineDistance(memories.embedding, embedding);

  const conditions = [
    eq(memories.userId, userId),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    lt(distance, SIMILARITY_THRESHOLD),
  ];

  // Exclude specific memory if provided (used in updateMemory)
  if (excludeId) {
    conditions.push(ne(memories.id, excludeId));
  }

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
    .where(and(...conditions))
    .orderBy(asc(distance))
    .limit(SIMILAR_MEMORIES_LIMIT);

  const duration = Math.round(performance.now() - start);

  logger.debug(
    {
      userId,
      duration,
      found: results.length,
      excludeId,
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

  // Step 1: Generate query variants and original embedding in parallel
  const [queryVariants, originalEmbedding] = await Promise.all([
    generateQueryVariants(query, timing),
    generateEmbedding(query, timing),
  ]);

  // Step 2: Generate variant embeddings + run original search in parallel
  // This saves ~200-300ms by not waiting for variant embeddings before searching
  const runSearch = async (embedding: number[]) => {
    const distance = cosineDistance(memories.embedding, embedding);
    const conditions = [
      eq(memories.userId, userId),
      eq(memories.isCurrent, true),
      isNull(memories.deletedAt),
      lt(distance, SEARCH_THRESHOLD),
    ];
    if (category) conditions.push(eq(memories.category, category));
    if (project) conditions.push(eq(memories.project, project));

    return db
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
  };

  const searchStart = performance.now();

  // Filter out empty/whitespace-only variants to prevent embedding failures
  const validVariants = queryVariants.filter((v) => v && v.trim().length > 0);

  // Run original query search AND generate variant embeddings in parallel
  const [originalResults, variantEmbeddings] = await Promise.all([
    runSearch(originalEmbedding),
    Promise.all(
      validVariants.map((variant) => generateEmbedding(variant, timing)),
    ),
  ]);

  // Step 3: Search with variant embeddings in parallel
  const variantResults = await (timing
    ? withTiming(timing, "db_search_variants", () =>
        Promise.all(variantEmbeddings.map((emb) => runSearch(emb))),
      )
    : Promise.all(variantEmbeddings.map((emb) => runSearch(emb))));

  // Combine all results
  const allResults = [originalResults, ...variantResults];

  // Merge and dedupe results, keeping highest relevance (lowest distance) per memory
  const mergedMap = new Map<
    string,
    (typeof allResults)[0][0] & { distance: number }
  >();
  for (const resultSet of allResults) {
    for (const row of resultSet) {
      const existing = mergedMap.get(row.id);
      if (
        !existing ||
        (row.distance as number) < (existing.distance as number)
      ) {
        mergedMap.set(
          row.id,
          row as (typeof allResults)[0][0] & { distance: number },
        );
      }
    }
  }

  // Sort by distance and limit
  const merged = Array.from(mergedMap.values())
    .sort((a, b) => (a.distance as number) - (b.distance as number))
    .slice(0, limit);

  const searchDuration = Math.round(performance.now() - searchStart);

  const memoriesWithRelevance: MemoryWithRelevance[] = merged.map((row) => ({
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
      variantCount: validVariants.length,
      totalQueries: validVariants.length + 1,
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

interface UpdateMemoryParams {
  userId: string;
  memoryId: string;
  content?: string;
  category?: MemoryCategory;
  project?: string;
  timing?: TimingContext;
}

interface UpdateMemoryResult {
  success: boolean;
  memory?: {
    id: string;
    content: string;
    category: string | null;
    project: string | null;
  };
  superseded?: string;
  relatedTo?: string;
  error?: string;
}

export async function updateMemory(
  params: UpdateMemoryParams,
): Promise<UpdateMemoryResult> {
  const { userId, memoryId, content, category, timing } = params;
  const project = normalizeProjectName(params.project);
  const start = performance.now();

  // 1. Fetch existing memory
  const [existing] = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.id, memoryId),
        eq(memories.userId, userId),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
      ),
    );

  if (!existing) {
    logger.warn({ userId, memoryId }, "update failed - memory not found");
    return { success: false, error: "Memory not found" };
  }

  // 2. If only category/project changed, simple update
  if (!content || content === existing.content) {
    const [updated] = await db
      .update(memories)
      .set({
        category: category ?? existing.category,
        project: project ?? existing.project,
      })
      .where(eq(memories.id, memoryId))
      .returning({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        project: memories.project,
      });

    const duration = Math.round(performance.now() - start);
    logger.info(
      { memoryId, userId, duration, updatedFields: ["category", "project"] },
      "memory metadata updated",
    );

    return { success: true, memory: updated };
  }

  // 3. Content changed - run through classification flow
  const expandedContent = await expandMemory(content, timing);
  const embedding = await generateEmbedding(expandedContent, timing);

  // Find similar memories, EXCLUDING current memory
  const similarMemories = await findSimilarMemories(
    userId,
    embedding,
    memoryId,
  );

  // 4. If no similar memories, just update in place
  if (similarMemories.length === 0) {
    const [updated] = await db
      .update(memories)
      .set({
        content,
        embedding,
        category: category ?? existing.category,
        project: project ?? existing.project,
      })
      .where(eq(memories.id, memoryId))
      .returning({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        project: memories.project,
      });

    const duration = Math.round(performance.now() - start);
    logger.info(
      { memoryId, userId, duration, contentChanged: true },
      "memory content updated (no similar memories)",
    );

    return { success: true, memory: updated };
  }

  // 5. Classify relationship with OTHER memories
  const memoriesForClassification = similarMemories.map((m, idx) => ({
    index: idx,
    content: m.content,
  }));

  const classification = await classifyWithSimilarMemories(
    memoriesForClassification,
    content,
    timing,
  );

  const targetMemory =
    classification.targetIndex !== undefined
      ? similarMemories[classification.targetIndex]
      : similarMemories[0];

  // 6. Handle based on classification
  if (classification.action === "noop") {
    const duration = Math.round(performance.now() - start);
    logger.warn(
      { memoryId, userId, duration, duplicateOf: targetMemory.id },
      "update rejected - content duplicates another memory",
    );
    return {
      success: false,
      error: "Updated content duplicates another memory",
    };
  }

  if (classification.action === "update") {
    // This update supersedes ANOTHER memory
    await db.transaction(async (tx) => {
      await tx
        .update(memories)
        .set({
          content,
          embedding,
          category: category ?? existing.category,
          project: project ?? existing.project,
        })
        .where(eq(memories.id, memoryId));

      await tx
        .update(memories)
        .set({ isCurrent: false })
        .where(eq(memories.id, targetMemory.id));
    });

    const duration = Math.round(performance.now() - start);
    logger.info(
      { memoryId, userId, duration, superseded: targetMemory.id },
      "memory updated and superseded another",
    );

    return { success: true, superseded: targetMemory.id };
  }

  // extend or similar - update current + create relation
  const relationType =
    classification.action === "extend" ? "extends" : "similar";

  await db.transaction(async (tx) => {
    await tx
      .update(memories)
      .set({
        content,
        embedding,
        category: category ?? existing.category,
        project: project ?? existing.project,
      })
      .where(eq(memories.id, memoryId));

    await tx.insert(memoryRelations).values({
      sourceId: memoryId,
      targetId: targetMemory.id,
      relationType,
      strength: 1 - targetMemory.distance,
    });
  });

  const duration = Math.round(performance.now() - start);
  logger.info(
    { memoryId, userId, duration, relatedTo: targetMemory.id, relationType },
    "memory updated with relation",
  );

  return { success: true, relatedTo: targetMemory.id };
}

interface ListMemoriesParams {
  userId: string;
  limit?: number;
  offset?: number;
  category?: MemoryCategory;
  project?: string;
}

interface ListMemoriesResult {
  memories: Array<{
    id: string;
    content: string;
    category: string | null;
    project: string | null;
    source: string;
    createdAt: Date;
  }>;
  total: number;
  hasMore: boolean;
}

export async function listMemories(
  params: ListMemoriesParams,
): Promise<ListMemoriesResult> {
  const { userId, limit = 20, offset = 0, category } = params;
  const project = normalizeProjectName(params.project);
  const start = performance.now();

  const conditions = [
    eq(memories.userId, userId),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
  ];

  if (category) {
    conditions.push(eq(memories.category, category));
  }
  if (project) {
    conditions.push(eq(memories.project, project));
  }

  const [results, countResult] = await Promise.all([
    db
      .select({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        project: memories.project,
        source: memories.source,
        createdAt: memories.createdAt,
      })
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.createdAt))
      .limit(limit)
      .offset(offset),

    db
      .select({ count: sql<number>`count(*)::int` })
      .from(memories)
      .where(and(...conditions)),
  ]);

  const total = countResult[0]?.count ?? 0;
  const duration = Math.round(performance.now() - start);

  logger.debug(
    {
      userId,
      limit,
      offset,
      category,
      project,
      found: results.length,
      total,
      duration,
    },
    "memories listed",
  );

  return {
    memories: results,
    total,
    hasMore: offset + results.length < total,
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
