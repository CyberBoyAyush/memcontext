import { db, memories, memoryFeedback, memoryRelations } from "../db/index.js";
import {
  generateEmbedding,
  expandMemory,
  generateQueryVariants,
} from "./embedding.js";
import {
  classifyWithSimilarMemories,
  type SimilarMemoryForClassification,
} from "./relation.js";
import {
  incrementMemoryCount,
  decrementMemoryCount,
  checkMemoryLimit,
} from "./subscription.js";
import { normalizeProjectName, normalizeScope } from "../utils/index.js";
import { logger } from "../lib/logger.js";
import {
  eq,
  and,
  isNull,
  lt,
  asc,
  desc,
  sql,
  ne,
  like,
  ilike,
  inArray,
  or,
} from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import type {
  FeedbackType,
  Memory,
  MemoryCategory,
  MemoryFeedbackResponse,
  MemoryGraphLink,
  MemoryGraphLinkType,
  MemoryGraphNode,
  MemoryGraphResponse,
  MemoryHistoryResponse,
  MemoryProfile,
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
const NO_PROJECT_FILTER_VALUE = "__memcontext_no_project__";

interface SaveMemoryParams {
  userId: string;
  content: string;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  source: MemorySource;
  timing?: TimingContext;
  validUntil?: string;
}

interface SearchMemoriesParams {
  userId: string;
  query: string;
  limit?: number;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  timing?: TimingContext;
  threshold?: number;
}

export async function saveMemory(
  params: SaveMemoryParams,
): Promise<SaveMemoryResponse> {
  const { userId, content, category, source, timing, validUntil } = params;
  const scope = normalizeScope(params.scope);
  const project = normalizeProjectName(params.project);
  const userValidUntil = validUntil ? new Date(validUntil) : undefined;

  const expandResult = await expandMemory(content, timing);
  const expandedContent = expandResult.expandedContent;

  // Auto-TTL: only apply if user/agent did NOT explicitly provide validUntil
  const autoValidUntil =
    !userValidUntil && expandResult.suggestedTtlDays
      ? new Date(Date.now() + expandResult.suggestedTtlDays * 86400000)
      : undefined;
  const validUntilDate = userValidUntil ?? autoValidUntil;

  const embedding = await generateEmbedding(expandedContent, timing);

  const similarMemories = await (timing
    ? withTiming(timing, "find_similar", () =>
        findSimilarMemories(userId, embedding, undefined, scope),
      )
    : findSimilarMemories(userId, embedding, undefined, scope));

  if (similarMemories.length === 0) {
    const result = await (timing
      ? withTiming(timing, "db_insert", async () =>
          db.transaction(async (tx) => {
            const limitCheck = await checkMemoryLimit(userId, tx);
            if (!limitCheck.allowed) {
              return {
                limitExceeded: true,
                current: limitCheck.current,
                limit: limitCheck.limit,
              };
            }
            const [newMemory] = await tx
              .insert(memories)
              .values({
                userId,
                scope,
                content,
                embedding,
                category,
                project,
                source,
                validFrom: new Date(),
                validUntil: validUntilDate,
              })
              .returning({ id: memories.id });
            await incrementMemoryCount(userId, tx);
            return { limitExceeded: false, id: newMemory.id };
          }),
        )
      : db.transaction(async (tx) => {
          const limitCheck = await checkMemoryLimit(userId, tx);
          if (!limitCheck.allowed) {
            return {
              limitExceeded: true,
              current: limitCheck.current,
              limit: limitCheck.limit,
            };
          }
          const [newMemory] = await tx
            .insert(memories)
            .values({
              userId,
              scope,
              content,
              embedding,
              category,
              project,
              source,
              validFrom: new Date(),
              validUntil: validUntilDate,
            })
            .returning({ id: memories.id });
          await incrementMemoryCount(userId, tx);
          return { limitExceeded: false, id: newMemory.id };
        }));

    if (result.limitExceeded) {
      logger.warn(
        { userId, current: result.current, limit: result.limit },
        "memory limit exceeded",
      );
      return {
        id: "",
        status: "limit_exceeded",
        current: result.current,
        limit: result.limit,
      };
    }

    logger.info(
      {
        memoryId: result.id,
        userId,
        scope,
        project,
        contentLength: content.length,
        status: "saved",
      },
      "memory created",
    );

    return {
      id: result.id!,
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

    // Re-confirmation: only extend existing TTL-backed memories.
    // Duplicate saves should not introduce a TTL to permanent memories or shorten one.
    const suggestedRefresh =
      validUntilDate ??
      (expandResult.suggestedTtlDays
        ? new Date(Date.now() + expandResult.suggestedTtlDays * 86400000)
        : undefined);
    const refreshedValidUntil =
      targetMemory.validUntil && suggestedRefresh
        ? suggestedRefresh.getTime() > targetMemory.validUntil.getTime()
          ? suggestedRefresh
          : targetMemory.validUntil
        : undefined;

    if (refreshedValidUntil) {
      await db
        .update(memories)
        .set({ validUntil: refreshedValidUntil })
        .where(eq(memories.id, targetMemory.id));
    }

    logger.info(
      {
        existingMemoryId: targetMemory.id,
        userId,
        scope,
        project,
        contentLength: content.length,
        status: "duplicate",
        reason: classification.reason,
        ttlRefreshed: !!refreshedValidUntil,
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
                scope: scope ?? targetMemory.scope,
                content,
                embedding,
                category: category ?? targetMemory.category,
                project: project ?? targetMemory.project,
                source,
                supersedesId: targetMemory.id,
                rootId: targetMemory.rootId ?? targetMemory.id,
                version: targetMemory.version + 1,
                validFrom: new Date(),
                validUntil: validUntilDate,
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
              scope: scope ?? targetMemory.scope,
              content,
              embedding,
              category: category ?? targetMemory.category,
              project: project ?? targetMemory.project,
              source,
              supersedesId: targetMemory.id,
              rootId: targetMemory.rootId ?? targetMemory.id,
              version: targetMemory.version + 1,
              validFrom: new Date(),
              validUntil: validUntilDate,
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
        scope,
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
  const classificationStatus =
    classification.action === "extend" ? "extended" : "saved";

  const result = await (timing
    ? withTiming(timing, "db_insert_related", async () =>
        db.transaction(async (tx) => {
          const limitCheck = await checkMemoryLimit(userId, tx);
          if (!limitCheck.allowed) {
            return {
              limitExceeded: true,
              current: limitCheck.current,
              limit: limitCheck.limit,
            };
          }
          const [newMemory] = await tx
            .insert(memories)
            .values({
              userId,
              scope,
              content,
              embedding,
              category,
              project,
              source,
              validFrom: new Date(),
              validUntil: validUntilDate,
            })
            .returning({ id: memories.id });
          await tx.insert(memoryRelations).values({
            sourceId: newMemory.id,
            targetId: targetMemory.id,
            relationType,
            strength: 1 - targetMemory.distance,
          });
          await incrementMemoryCount(userId, tx);
          return { limitExceeded: false, id: newMemory.id };
        }),
      )
    : db.transaction(async (tx) => {
        const limitCheck = await checkMemoryLimit(userId, tx);
        if (!limitCheck.allowed) {
          return {
            limitExceeded: true,
            current: limitCheck.current,
            limit: limitCheck.limit,
          };
        }
        const [newMemory] = await tx
          .insert(memories)
          .values({
            userId,
            scope,
            content,
            embedding,
            category,
            project,
            source,
            validFrom: new Date(),
            validUntil: validUntilDate,
          })
          .returning({ id: memories.id });
        await tx.insert(memoryRelations).values({
          sourceId: newMemory.id,
          targetId: targetMemory.id,
          relationType,
          strength: 1 - targetMemory.distance,
        });
        await incrementMemoryCount(userId, tx);
        return { limitExceeded: false, id: newMemory.id };
      }));

  if (result.limitExceeded) {
    logger.warn(
      { userId, current: result.current, limit: result.limit },
      "memory limit exceeded",
    );
    return {
      id: "",
      status: "limit_exceeded",
      current: result.current,
      limit: result.limit,
    };
  }

  logger.info(
    {
      memoryId: result.id,
      relatedTo: targetMemory.id,
      relationType,
      userId,
      scope,
      project,
      contentLength: content.length,
      status: classificationStatus,
      reason: classification.reason,
    },
    `memory ${classificationStatus}`,
  );

  return {
    id: result.id!,
    status: classificationStatus,
  };
}

interface SimilarMemoryResult {
  id: string;
  content: string;
  category: string | null;
  scope: string | null;
  project: string | null;
  rootId: string | null;
  version: number;
  validUntil: Date | null;
  distance: number;
}

export async function findSimilarMemories(
  userId: string,
  embedding: number[],
  excludeId?: string,
  scope?: string,
): Promise<SimilarMemoryResult[]> {
  const start = performance.now();
  const distance = cosineDistance(memories.embedding, embedding);
  const normalizedScope = normalizeScope(scope);

  const conditions = [
    eq(memories.userId, userId),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    sql`(${memories.validUntil} IS NULL OR ${memories.validUntil} > NOW())`,
    lt(distance, SIMILARITY_THRESHOLD),
  ];

  conditions.push(
    normalizedScope
      ? eq(memories.scope, normalizedScope)
      : isNull(memories.scope),
  );

  // Exclude specific memory if provided (used in updateMemory)
  if (excludeId) {
    conditions.push(ne(memories.id, excludeId));
  }

  const results = await db
    .select({
      id: memories.id,
      content: memories.content,
      category: memories.category,
      scope: memories.scope,
      project: memories.project,
      rootId: memories.rootId,
      version: memories.version,
      validUntil: memories.validUntil,
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
      scope: normalizedScope,
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
  const scope = normalizeScope(params.scope);
  const project = normalizeProjectName(params.project);
  const threshold = params.threshold ?? SEARCH_THRESHOLD;
  const activeMemoryCondition = sql`(${memories.validUntil} IS NULL OR ${memories.validUntil} > NOW())`;

  // Step 1: Generate query variants and original embedding in parallel
  const [queryVariants, originalEmbedding] = await Promise.all([
    generateQueryVariants(query, timing),
    generateEmbedding(query, timing),
  ]);

  // Step 2: Generate variant embeddings + run vector/FTS search in parallel
  const runVectorSearch = async (embedding: number[]) => {
    const distance = cosineDistance(memories.embedding, embedding);
    const conditions = [
      eq(memories.userId, userId),
      eq(memories.isCurrent, true),
      isNull(memories.deletedAt),
      activeMemoryCondition,
      lt(distance, threshold),
      scope ? eq(memories.scope, scope) : isNull(memories.scope),
    ];
    if (category) conditions.push(eq(memories.category, category));
    if (project) conditions.push(eq(memories.project, project));

    return db
      .select({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        scope: memories.scope,
        project: memories.project,
        createdAt: memories.createdAt,
      })
      .from(memories)
      .where(and(...conditions))
      .orderBy(asc(distance))
      .limit(Math.max(limit * 2, 10));
  };

  const runFtsSearch = async (queryText: string) => {
    const conditions = [
      eq(memories.userId, userId),
      eq(memories.isCurrent, true),
      isNull(memories.deletedAt),
      activeMemoryCondition,
      sql`content_tsv @@ plainto_tsquery('english', ${queryText})`,
      scope ? eq(memories.scope, scope) : isNull(memories.scope),
    ];
    if (category) conditions.push(eq(memories.category, category));
    if (project) conditions.push(eq(memories.project, project));

    const tsRank = sql<number>`ts_rank(content_tsv, plainto_tsquery('english', ${queryText}))`;

    return db
      .select({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        scope: memories.scope,
        project: memories.project,
        createdAt: memories.createdAt,
        rank: tsRank,
      })
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(tsRank))
      .limit(Math.max(limit * 2, 10));
  };

  const searchStart = performance.now();

  // Filter out empty/whitespace-only variants to prevent embedding failures
  const validVariants = queryVariants.filter((v) => v && v.trim().length > 0);

  // Run original vector search, original FTS search, and generate variant embeddings in parallel
  const [originalResults, ftsResults, variantEmbeddings] = await Promise.all([
    runVectorSearch(originalEmbedding),
    runFtsSearch(query),
    Promise.all(
      validVariants.map((variant) => generateEmbedding(variant, timing)),
    ),
  ]);

  // Step 3: Search with variant embeddings and FTS variant queries in parallel
  const [variantResults, ftsVariantResults] = await (timing
    ? withTiming(timing, "db_search_variants", () =>
        Promise.all([
          Promise.all(variantEmbeddings.map((emb) => runVectorSearch(emb))),
          Promise.all(validVariants.map((variant) => runFtsSearch(variant))),
        ]),
      )
    : Promise.all([
        Promise.all(variantEmbeddings.map((emb) => runVectorSearch(emb))),
        Promise.all(validVariants.map((variant) => runFtsSearch(variant))),
      ]));

  // Combine all results via Reciprocal Rank Fusion (RRF)
  const allResults = [
    originalResults,
    ...variantResults,
    ftsResults,
    ...ftsVariantResults,
  ];
  const fusedScores = new Map<
    string,
    {
      score: number;
      row: {
        id: string;
        content: string;
        category: string | null;
        scope: string | null;
        project: string | null;
        createdAt: Date;
      };
    }
  >();
  const rrfK = 60;

  for (const resultSet of allResults) {
    resultSet.forEach((row, index) => {
      const rrfScore = 1 / (rrfK + index + 1);
      const existing = fusedScores.get(row.id);
      fusedScores.set(row.id, {
        score: (existing?.score ?? 0) + rrfScore,
        row: existing?.row ?? {
          id: row.id,
          content: row.content,
          category: row.category,
          scope: row.scope,
          project: row.project,
          createdAt: row.createdAt,
        },
      });
    });
  }

  // Apply feedback-based scoring multipliers
  const candidateIds = Array.from(fusedScores.keys());
  let feedbackMap = new Map<
    string,
    { helpful: number; not_helpful: number; outdated: number; wrong: number }
  >();

  if (candidateIds.length > 0) {
    const feedbackRows = await db
      .select({
        memoryId: memoryFeedback.memoryId,
        type: memoryFeedback.type,
        count: sql<number>`count(*)::int`,
      })
      .from(memoryFeedback)
      .where(
        and(
          sql`${memoryFeedback.memoryId} IN (${sql.join(
            candidateIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
          eq(memoryFeedback.userId, userId),
        ),
      )
      .groupBy(memoryFeedback.memoryId, memoryFeedback.type);

    for (const row of feedbackRows) {
      const existing = feedbackMap.get(row.memoryId) ?? {
        helpful: 0,
        not_helpful: 0,
        outdated: 0,
        wrong: 0,
      };
      const fbType = row.type as string;
      if (fbType === "helpful") existing.helpful = row.count;
      else if (fbType === "not_helpful") existing.not_helpful = row.count;
      else if (fbType === "outdated") existing.outdated = row.count;
      else if (fbType === "wrong") existing.wrong = row.count;
      feedbackMap.set(row.memoryId, existing);
    }
  }

  for (const [id, entry] of fusedScores) {
    const fb = feedbackMap.get(id);
    if (!fb) continue;

    let multiplier = 1.0;
    if (fb.wrong > 0) {
      multiplier = 0.3;
    } else if (fb.outdated > 0) {
      multiplier = 0.5;
    } else if (fb.not_helpful > fb.helpful) {
      multiplier = 0.7;
    } else if (fb.helpful > 0 && fb.not_helpful === 0) {
      multiplier = 1.1;
    }

    fusedScores.set(id, { ...entry, score: entry.score * multiplier });
  }

  const merged = Array.from(fusedScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const searchDuration = Math.round(performance.now() - searchStart);
  const topScore = merged.length > 0 ? merged[0].score : 0;

  const memoriesWithRelevance: MemoryWithRelevance[] = merged.map(
    ({ row, score }) => ({
      id: row.id,
      content: row.content,
      category: row.category as MemoryCategory | undefined,
      scope: row.scope ?? undefined,
      project: row.project ?? undefined,
      relevance: topScore > 0 ? Math.round((score / topScore) * 100) / 100 : 0,
      createdAt: row.createdAt,
    }),
  );

  logger.info(
    {
      userId,
      queryLength: query.length,
      variantCount: validVariants.length,
      totalQueries: validVariants.length + 1,
      scope,
      project,
      category,
      threshold,
      ftsResultsCount: ftsResults.length,
      ftsVariantResultsCount: ftsVariantResults.reduce(
        (sum, resultSet) => sum + resultSet.length,
        0,
      ),
      resultsCount: memoriesWithRelevance.length,
      topScore: topScore > 0 ? Math.round(topScore * 1000) / 1000 : undefined,
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
  scope?: string;
  project?: string;
  timing?: TimingContext;
}

interface UpdateMemoryResult {
  success: boolean;
  memory?: {
    id: string;
    content: string;
    category: string | null;
    scope: string | null;
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
  const scope = normalizeScope(params.scope);
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
        scope ? eq(memories.scope, scope) : isNull(memories.scope),
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
        scope: memories.scope,
        project: memories.project,
      });

    const duration = Math.round(performance.now() - start);
    logger.info(
      {
        memoryId,
        userId,
        scope,
        duration,
        updatedFields: ["category", "project"],
      },
      "memory metadata updated",
    );

    return { success: true, memory: updated };
  }

  // 3. Content changed - run through classification flow
  const expandResult = await expandMemory(content, timing);
  const expandedContent = expandResult.expandedContent;
  const embedding = await generateEmbedding(expandedContent, timing);

  // Find similar memories, EXCLUDING current memory
  const similarMemories = await findSimilarMemories(
    userId,
    embedding,
    memoryId,
    scope,
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
        scope: memories.scope,
        project: memories.project,
      });

    const duration = Math.round(performance.now() - start);
    logger.info(
      { memoryId, userId, scope, duration, contentChanged: true },
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
      { memoryId, userId, scope, duration, duplicateOf: targetMemory.id },
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
      { memoryId, userId, scope, duration, superseded: targetMemory.id },
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
    {
      memoryId,
      userId,
      scope,
      duration,
      relatedTo: targetMemory.id,
      relationType,
    },
    "memory updated with relation",
  );

  return { success: true, relatedTo: targetMemory.id };
}

interface ListMemoriesParams {
  userId: string;
  limit?: number;
  offset?: number;
  category?: MemoryCategory;
  categories?: MemoryCategory[];
  scope?: string;
  project?: string;
  projects?: string[];
  search?: string;
}

interface ListMemoriesResult {
  memories: Array<{
    id: string;
    content: string;
    category: string | null;
    scope: string | null;
    project: string | null;
    source: string;
    createdAt: Date;
  }>;
  total: number;
  hasMore: boolean;
}

function buildGraphLabel(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= 56) {
    return normalized;
  }

  return `${normalized.slice(0, 53).trimEnd()}...`;
}

function buildGraphPairKey(source: string, target: string): string {
  return [source, target].sort().join(":");
}

function buildGraphLinkKey(
  source: string,
  target: string,
  type: MemoryGraphLinkType,
): string {
  return `${buildGraphPairKey(source, target)}:${type}`;
}

function addGroupedDerivedLinks(
  groups: Map<string, Array<{ id: string; createdAt: Date }>>,
  type: Extract<
    MemoryGraphLinkType,
    "shared-root" | "shared-project" | "shared-category"
  >,
  links: MemoryGraphLink[],
  existingLinkKeys: Set<string>,
): number {
  let added = 0;

  for (const nodes of groups.values()) {
    if (nodes.length < 2) {
      continue;
    }

    const sortedNodes = [...nodes].sort(
      (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
    );

    for (let index = 1; index < sortedNodes.length; index += 1) {
      const source = sortedNodes[index - 1];
      const target = sortedNodes[index];
      const linkKey = buildGraphLinkKey(source.id, target.id, type);

      if (existingLinkKeys.has(linkKey)) {
        continue;
      }

      existingLinkKeys.add(linkKey);
      links.push({
        id: `${type}:${source.id}:${target.id}`,
        source: source.id,
        target: target.id,
        type,
        strength: null,
        derived: true,
      });
      added += 1;
    }
  }

  return added;
}

export async function getMemoryGraph(
  userId: string,
  scope?: string,
): Promise<MemoryGraphResponse> {
  const normalizedScope = normalizeScope(scope);
  const memoryRows = await db
    .select({
      id: memories.id,
      content: memories.content,
      category: memories.category,
      scope: memories.scope,
      project: memories.project,
      rootId: memories.rootId,
      createdAt: memories.createdAt,
    })
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        eq(memories.isCurrent, true),
        isNull(memories.deletedAt),
        normalizedScope
          ? eq(memories.scope, normalizedScope)
          : isNull(memories.scope),
      ),
    )
    .orderBy(desc(memories.createdAt));

  if (memoryRows.length === 0) {
    return {
      nodes: [],
      links: [],
      meta: {
        totalNodes: 0,
        totalLinks: 0,
        relationLinks: 0,
        derivedLinks: 0,
      },
    };
  }

  const memoryIds = memoryRows.map((memory) => memory.id);
  const memoryIdSet = new Set(memoryIds);
  const relationRows = await db
    .select({
      source: memoryRelations.sourceId,
      target: memoryRelations.targetId,
      type: memoryRelations.relationType,
      strength: memoryRelations.strength,
    })
    .from(memoryRelations)
    .where(
      or(
        inArray(memoryRelations.sourceId, memoryIds),
        inArray(memoryRelations.targetId, memoryIds),
      ),
    );

  const links: MemoryGraphLink[] = [];
  const degreeById = new Map<string, number>(memoryIds.map((id) => [id, 0]));
  const existingLinkKeys = new Set<string>();

  let realRelationLinks = 0;
  for (const relation of relationRows) {
    // Skip dangling edges where one side no longer belongs to this user's current memories.
    if (
      !memoryIdSet.has(relation.source) ||
      !memoryIdSet.has(relation.target)
    ) {
      continue;
    }

    existingLinkKeys.add(
      buildGraphLinkKey(
        relation.source,
        relation.target,
        relation.type as MemoryGraphLinkType,
      ),
    );
    links.push({
      id: `relation:${relation.source}:${relation.target}:${relation.type}`,
      source: relation.source,
      target: relation.target,
      type: relation.type as MemoryGraphLinkType,
      strength: relation.strength,
      derived: false,
    });
    degreeById.set(relation.source, (degreeById.get(relation.source) ?? 0) + 1);
    degreeById.set(relation.target, (degreeById.get(relation.target) ?? 0) + 1);
    realRelationLinks += 1;
  }

  const rootGroups = new Map<string, Array<{ id: string; createdAt: Date }>>();
  const projectGroups = new Map<
    string,
    Array<{ id: string; createdAt: Date }>
  >();
  const categoryGroups = new Map<
    string,
    Array<{ id: string; createdAt: Date }>
  >();

  for (const memory of memoryRows) {
    const nodeRef = { id: memory.id, createdAt: memory.createdAt };

    // rootId falls back to the memory's own id so the root of a version chain
    // still groups with its own versions. The result is always a UUID, so no
    // truthiness check is needed.
    const rootGroupKey = memory.rootId ?? memory.id;
    const group = rootGroups.get(rootGroupKey) ?? [];
    group.push(nodeRef);
    rootGroups.set(rootGroupKey, group);

    if (memory.project) {
      const group = projectGroups.get(memory.project) ?? [];
      group.push(nodeRef);
      projectGroups.set(memory.project, group);
    }

    if (memory.category) {
      const group = categoryGroups.get(memory.category) ?? [];
      group.push(nodeRef);
      categoryGroups.set(memory.category, group);
    }
  }

  const derivedLinks =
    addGroupedDerivedLinks(rootGroups, "shared-root", links, existingLinkKeys) +
    addGroupedDerivedLinks(
      projectGroups,
      "shared-project",
      links,
      existingLinkKeys,
    ) +
    addGroupedDerivedLinks(
      categoryGroups,
      "shared-category",
      links,
      existingLinkKeys,
    );

  for (const link of links) {
    if (!link.derived) {
      continue;
    }

    degreeById.set(link.source, (degreeById.get(link.source) ?? 0) + 1);
    degreeById.set(link.target, (degreeById.get(link.target) ?? 0) + 1);
  }

  const nodes: MemoryGraphNode[] = memoryRows.map((memory) => ({
    id: memory.id,
    label: buildGraphLabel(memory.content),
    content: memory.content,
    category: memory.category,
    scope: memory.scope,
    project: memory.project,
    rootId: memory.rootId,
    createdAt: memory.createdAt.toISOString(),
    degree: degreeById.get(memory.id) ?? 0,
  }));

  return {
    nodes,
    links,
    meta: {
      totalNodes: nodes.length,
      totalLinks: links.length,
      relationLinks: realRelationLinks,
      derivedLinks,
    },
  };
}

export async function listMemories(
  params: ListMemoriesParams,
): Promise<ListMemoriesResult> {
  const {
    userId,
    limit = 20,
    offset = 0,
    category,
    categories,
    scope: rawScope,
    projects,
    search,
  } = params;
  const scope = normalizeScope(rawScope);
  const project = normalizeProjectName(params.project);
  const start = performance.now();

  const conditions = [
    eq(memories.userId, userId),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    scope ? eq(memories.scope, scope) : isNull(memories.scope),
  ];

  // Multi-value category filter
  const effectiveCategories = categories ?? (category ? [category] : undefined);
  if (effectiveCategories && effectiveCategories.length > 0) {
    if (effectiveCategories.length === 1) {
      conditions.push(eq(memories.category, effectiveCategories[0]));
    } else {
      conditions.push(
        sql`${memories.category} IN (${sql.join(
          effectiveCategories.map((c) => sql`${c}`),
          sql`, `,
        )})`,
      );
    }
  }

  // Multi-value project filter (supports dashboard's reserved no-project token)
  if (projects && projects.length > 0) {
    const hasGlobal = projects.includes(NO_PROJECT_FILTER_VALUE);
    const namedProjects = projects
      .filter((p) => p !== NO_PROJECT_FILTER_VALUE)
      .map((p) => normalizeProjectName(p))
      .filter((p): p is string => p !== undefined);

    if (hasGlobal && namedProjects.length === 0) {
      conditions.push(isNull(memories.project));
    } else if (!hasGlobal && namedProjects.length > 0) {
      if (namedProjects.length === 1) {
        conditions.push(eq(memories.project, namedProjects[0]));
      } else {
        conditions.push(
          sql`${memories.project} IN (${sql.join(
            namedProjects.map((p) => sql`${p}`),
            sql`, `,
          )})`,
        );
      }
    } else if (hasGlobal && namedProjects.length > 0) {
      // No project OR specific projects
      conditions.push(
        sql`(${memories.project} IS NULL OR ${memories.project} IN (${sql.join(
          namedProjects.map((p) => sql`${p}`),
          sql`, `,
        )}))`,
      );
    }
  } else if (project === NO_PROJECT_FILTER_VALUE) {
    conditions.push(isNull(memories.project));
  } else if (project) {
    const escapedProject = project
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    conditions.push(like(memories.project, `%${escapedProject}%`));
  }

  if (search) {
    const escapedSearch = search
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    conditions.push(ilike(memories.content, `%${escapedSearch}%`));
  }

  const [results, countResult] = await Promise.all([
    db
      .select({
        id: memories.id,
        content: memories.content,
        category: memories.category,
        scope: memories.scope,
        project: memories.project,
        source: memories.source,
        validFrom: memories.validFrom,
        validUntil: memories.validUntil,
        version: memories.version,
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
      categories: effectiveCategories,
      scope,
      projects,
      project,
      searchLength: search?.length,
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

export async function getMemory(
  userId: string,
  memoryId: string,
  scope?: string,
): Promise<Memory | null> {
  const normalizedScope = normalizeScope(scope);
  const [memory] = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.id, memoryId),
        eq(memories.userId, userId),
        isNull(memories.deletedAt),
        normalizedScope
          ? eq(memories.scope, normalizedScope)
          : isNull(memories.scope),
      ),
    );

  if (!memory) {
    return null;
  }

  return {
    id: memory.id,
    userId: memory.userId,
    scope: memory.scope ?? undefined,
    content: memory.content,
    category: (memory.category as MemoryCategory | null) ?? undefined,
    project: memory.project ?? undefined,
    source: memory.source as MemorySource,
    isCurrent: memory.isCurrent,
    supersedesId: memory.supersedesId ?? undefined,
    rootId: memory.rootId ?? undefined,
    version: memory.version,
    deletedAt: memory.deletedAt ?? undefined,
    validFrom: memory.validFrom ?? undefined,
    validUntil: memory.validUntil ?? undefined,
    createdAt: memory.createdAt,
  };
}

export async function submitFeedback(
  userId: string,
  memoryId: string,
  type: FeedbackType,
  context?: string,
  scope?: string,
): Promise<MemoryFeedbackResponse> {
  const memory = await getMemory(userId, memoryId, scope);
  if (!memory) {
    throw new Error("Memory not found");
  }

  await db.insert(memoryFeedback).values({
    memoryId,
    userId,
    type,
    context,
  });

  return { success: true };
}

export async function getMemoryProfile(
  userId: string,
  project?: string,
  scope?: string,
): Promise<MemoryProfile> {
  const normalizedProject = normalizeProjectName(project);
  const normalizedScope = normalizeScope(scope);

  const staticConditions = [
    eq(memories.userId, userId),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    normalizedScope
      ? eq(memories.scope, normalizedScope)
      : isNull(memories.scope),
    sql`${memories.category} IN ('preference', 'fact')`,
    sql`${memories.createdAt} < NOW() - INTERVAL '7 days'`,
    sql`(${memories.validUntil} IS NULL OR ${memories.validUntil} > NOW())`,
  ];

  if (normalizedProject) {
    staticConditions.push(eq(memories.project, normalizedProject));
  }

  const dynamicConditions = [
    eq(memories.userId, userId),
    eq(memories.isCurrent, true),
    isNull(memories.deletedAt),
    normalizedScope
      ? eq(memories.scope, normalizedScope)
      : isNull(memories.scope),
    sql`${memories.createdAt} > NOW() - INTERVAL '14 days'`,
    sql`(${memories.validUntil} IS NULL OR ${memories.validUntil} > NOW())`,
  ];

  if (normalizedProject) {
    dynamicConditions.push(eq(memories.project, normalizedProject));
  }

  const [staticMemories, dynamicMemories] = await Promise.all([
    db
      .select({ content: memories.content })
      .from(memories)
      .where(and(...staticConditions))
      .orderBy(asc(memories.createdAt))
      .limit(15),
    db
      .select({ content: memories.content })
      .from(memories)
      .where(and(...dynamicConditions))
      .orderBy(desc(memories.createdAt))
      .limit(10),
  ]);

  return {
    static: staticMemories.map((memory) => memory.content),
    dynamic: dynamicMemories.map((memory) => memory.content),
  };
}

export async function getMemoryHistory(
  userId: string,
  memoryId: string,
  scope?: string,
): Promise<MemoryHistoryResponse | null> {
  const normalizedScope = normalizeScope(scope);
  const memory = await getMemory(userId, memoryId, normalizedScope);
  if (!memory) {
    return null;
  }

  const rootId = memory.rootId ?? memory.id;
  const rows = await db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.userId, userId),
        isNull(memories.deletedAt),
        normalizedScope
          ? eq(memories.scope, normalizedScope)
          : isNull(memories.scope),
        sql`(${memories.rootId} = ${rootId} OR ${memories.id} = ${rootId})`,
      ),
    )
    .orderBy(desc(memories.version), desc(memories.createdAt));

  const allVersions: Memory[] = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    scope: row.scope ?? undefined,
    content: row.content,
    category: (row.category as MemoryCategory | null) ?? undefined,
    project: row.project ?? undefined,
    source: row.source as MemorySource,
    isCurrent: row.isCurrent,
    supersedesId: row.supersedesId ?? undefined,
    rootId: row.rootId ?? undefined,
    version: row.version,
    deletedAt: row.deletedAt ?? undefined,
    validFrom: row.validFrom ?? undefined,
    validUntil: row.validUntil ?? undefined,
    createdAt: row.createdAt,
  }));

  const current = allVersions.find((row) => row.isCurrent) ?? allVersions[0];

  return {
    current,
    history: allVersions.filter((row) => row.id !== current.id),
  };
}

export async function deleteMemory(
  userId: string,
  memoryId: string,
  scope?: string,
): Promise<boolean> {
  const start = performance.now();
  const normalizedScope = normalizeScope(scope);

  const deleted = await db.transaction(async (tx) => {
    const [deletedRow] = await tx
      .update(memories)
      .set({ deletedAt: sql`NOW()` })
      .where(
        and(
          eq(memories.id, memoryId),
          eq(memories.userId, userId),
          isNull(memories.deletedAt),
          normalizedScope
            ? eq(memories.scope, normalizedScope)
            : isNull(memories.scope),
        ),
      )
      .returning({ isCurrent: memories.isCurrent });

    const wasDeleted = !!deletedRow;

    if (deletedRow?.isCurrent) {
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
        scope: normalizedScope,
        duration,
      },
      "memory deleted",
    );
  } else {
    logger.warn(
      {
        memoryId,
        userId,
        scope: normalizedScope,
        duration,
      },
      "memory delete failed - not found",
    );
  }

  return deleted;
}
