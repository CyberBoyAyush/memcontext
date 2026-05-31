import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  real,
  index,
  uniqueIndex,
  pgEnum,
  vector,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const memoryFeedbackTypeEnum = pgEnum("memory_feedback_type", [
  "helpful",
  "not_helpful",
  "outdated",
  "wrong",
]);

export const PLAN_LIMITS = {
  free: 300,
  hobby: 2000,
  pro: 10000,
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

// Subscription status for paid users
export type SubscriptionStatus =
  | "active"
  | "on_hold"
  | "cancelled"
  | "expired"
  | "failed";

// Note: Foreign keys to user table are managed via SQL migration
// to avoid cross-file import issues with drizzle-kit
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  memoryCount: integer("memory_count").notNull().default(0),
  memoryLimit: integer("memory_limit").notNull().default(300),
  // Dodo Payments fields (only populated for paid users)
  dodoCustomerId: text("dodo_customer_id"),
  dodoSubscriptionId: text("dodo_subscription_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    name: text("name").notNull(),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("api_keys_user_id_idx").on(table.userId)],
);

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id"),
    scope: text("scope"),
    memoryType: text("memory_type").notNull().default("user"),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    category: text("category"),
    project: text("project"),
    source: text("source").notNull(),
    isCurrent: boolean("is_current").default(true).notNull(),
    supersedesId: uuid("supersedes_id"),
    rootId: uuid("root_id"),
    version: integer("version").default(1).notNull(),
    deletedAt: timestamp("deleted_at"),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // `content_tsv` is created via raw SQL migration as a generated column.
    // Search queries reference it with `sql` template literals in memory.ts.
  },
  (table) => [
    index("memories_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("memories_user_current_idx").on(
      table.userId,
      table.isCurrent,
      table.deletedAt,
    ),
    index("memories_user_scope_current_idx").on(
      table.userId,
      table.scope,
      table.isCurrent,
      table.deletedAt,
    ),
    index("memories_user_scope_project_current_idx")
      .on(table.userId, table.scope, table.project)
      .where(sql`${table.isCurrent} = true AND ${table.deletedAt} IS NULL`),
    index("memories_workspace_scope_type_current_idx")
      .on(table.workspaceId, table.scope, table.memoryType)
      .where(sql`${table.isCurrent} = true AND ${table.deletedAt} IS NULL`),
    index("memories_supersedes_idx").on(table.supersedesId),
    index("memories_root_idx").on(table.rootId),
    index("memories_valid_until_idx").on(table.validUntil),
  ],
);

export const memorySources = pgTable(
  "memory_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id"),
    scope: text("scope"),
    project: text("project"),
    category: text("category"),
    source: text("source").notNull(),
    sourceType: text("source_type").notNull().default("text"),
    status: text("status").notNull().default("pending"),
    reservedSlots: integer("reserved_slots").notNull().default(0),
    title: text("title"),
    originalFilename: text("original_filename"),
    mimeType: text("mime_type"),
    storageKey: text("storage_key"),
    contentHash: text("content_hash"),
    parserVersion: text("parser_version"),
    chunkerVersion: text("chunker_version"),
    extractorVersion: text("extractor_version"),
    chunkCount: integer("chunk_count").notNull().default(0),
    extractedCount: integer("extracted_count").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    lockedAt: timestamp("locked_at"),
    nextRunAt: timestamp("next_run_at"),
    payload: jsonb("payload").notNull(),
    error: text("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("memory_sources_user_status_idx").on(table.userId, table.status),
    index("memory_sources_workspace_status_idx").on(
      table.workspaceId,
      table.status,
    ),
    index("memory_sources_status_created_idx").on(table.status, table.createdAt),
    index("memory_sources_content_hash_idx").on(
      table.workspaceId,
      table.contentHash,
    ),
  ],
);

export const memorySourceChunks = pgTable(
  "memory_source_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => memorySources.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id"),
    scope: text("scope"),
    project: text("project"),
    chunkIndex: integer("chunk_index").notNull(),
    parentIndex: integer("parent_index").notNull().default(0),
    content: text("content").notNull(),
    contextualContent: text("contextual_content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    tokenCount: integer("token_count"),
    contentHash: text("content_hash"),
    pageNumber: integer("page_number"),
    sectionPath: text("section_path"),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("memory_source_chunks_source_index_idx").on(
      table.sourceId,
      table.chunkIndex,
    ),
    index("memory_source_chunks_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
    index("memory_source_chunks_user_scope_idx").on(
      table.userId,
      table.scope,
      table.project,
    ),
    index("memory_source_chunks_workspace_scope_idx").on(
      table.workspaceId,
      table.scope,
      table.project,
    ),
    index("memory_source_chunks_source_idx").on(table.sourceId),
  ],
);

export const memoryEvidence = pgTable(
  "memory_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => memorySources.id, { onDelete: "cascade" }),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => memorySourceChunks.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    workspaceId: uuid("workspace_id"),
    scope: text("scope"),
    quote: text("quote"),
    confidence: real("confidence"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("memory_evidence_memory_chunk_idx").on(
      table.memoryId,
      table.chunkId,
    ),
    index("memory_evidence_memory_idx").on(table.memoryId),
    index("memory_evidence_chunk_idx").on(table.chunkId),
    index("memory_evidence_source_idx").on(table.sourceId),
    index("memory_evidence_workspace_scope_idx").on(
      table.workspaceId,
      table.scope,
    ),
  ],
);

export const memoryRelations = pgTable(
  "memory_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    workspaceId: uuid("workspace_id"),
    scope: text("scope"),
    sourceId: uuid("source_id").notNull(),
    targetId: uuid("target_id").notNull(),
    relationType: text("relation_type").notNull(),
    strength: real("strength"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("memory_relations_source_idx").on(table.sourceId),
    index("memory_relations_target_idx").on(table.targetId),
    index("memory_relations_workspace_scope_idx").on(
      table.workspaceId,
      table.scope,
    ),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("workspaces_created_by_idx").on(table.createdByUserId)],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("workspace_members_workspace_user_idx").on(
      table.workspaceId,
      table.userId,
    ),
    index("workspace_members_user_idx").on(table.userId),
    index("workspace_members_workspace_idx").on(table.workspaceId),
  ],
);

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    tokenHash: text("token_hash").notNull().unique(),
    invitedByUserId: text("invited_by_user_id").notNull(),
    acceptedByUserId: text("accepted_by_user_id"),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workspace_invitations_workspace_idx").on(table.workspaceId),
    index("workspace_invitations_email_idx").on(table.email),
    index("workspace_invitations_token_hash_idx").on(table.tokenHash),
  ],
);

export const memoryFeedback = pgTable(
  "memory_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memoryId: uuid("memory_id")
      .notNull()
      .references(() => memories.id),
    userId: text("user_id").notNull(),
    type: memoryFeedbackTypeEnum("type").notNull(),
    context: text("context"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("memory_feedback_memory_idx").on(table.memoryId),
    index("memory_feedback_user_idx").on(table.userId),
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKeyRow = typeof apiKeys.$inferInsert;
export type MemoryRow = typeof memories.$inferSelect;
export type NewMemoryRow = typeof memories.$inferInsert;
export type MemorySourceRow = typeof memorySources.$inferSelect;
export type NewMemorySourceRow = typeof memorySources.$inferInsert;
export type MemorySourceChunkRow = typeof memorySourceChunks.$inferSelect;
export type NewMemorySourceChunkRow = typeof memorySourceChunks.$inferInsert;
export type MemoryEvidenceRow = typeof memoryEvidence.$inferSelect;
export type NewMemoryEvidenceRow = typeof memoryEvidence.$inferInsert;
export type MemoryRelationRow = typeof memoryRelations.$inferSelect;
export type NewMemoryRelationRow = typeof memoryRelations.$inferInsert;
export type MemoryFeedbackRow = typeof memoryFeedback.$inferSelect;
export type NewMemoryFeedbackRow = typeof memoryFeedback.$inferInsert;
export type WorkspaceRow = typeof workspaces.$inferSelect;
export type NewWorkspaceRow = typeof workspaces.$inferInsert;
export type WorkspaceMemberRow = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMemberRow = typeof workspaceMembers.$inferInsert;
export type WorkspaceInvitationRow = typeof workspaceInvitations.$inferSelect;
export type NewWorkspaceInvitationRow = typeof workspaceInvitations.$inferInsert;

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  source: text("source").notNull(),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WaitlistRow = typeof waitlist.$inferSelect;
export type NewWaitlistRow = typeof waitlist.$inferInsert;
