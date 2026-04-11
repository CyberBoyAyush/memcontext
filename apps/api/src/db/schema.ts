import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  real,
  index,
  pgEnum,
  vector,
} from "drizzle-orm/pg-core";

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
    index("memories_supersedes_idx").on(table.supersedesId),
    index("memories_root_idx").on(table.rootId),
    index("memories_valid_until_idx").on(table.validUntil),
  ],
);

export const memoryRelations = pgTable(
  "memory_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id").notNull(),
    targetId: uuid("target_id").notNull(),
    relationType: text("relation_type").notNull(),
    strength: real("strength"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("memory_relations_source_idx").on(table.sourceId),
    index("memory_relations_target_idx").on(table.targetId),
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
export type MemoryRelationRow = typeof memoryRelations.$inferSelect;
export type NewMemoryRelationRow = typeof memoryRelations.$inferInsert;
export type MemoryFeedbackRow = typeof memoryFeedback.$inferSelect;
export type NewMemoryFeedbackRow = typeof memoryFeedback.$inferInsert;

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  source: text("source").notNull(),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WaitlistRow = typeof waitlist.$inferSelect;
export type NewWaitlistRow = typeof waitlist.$inferInsert;
