import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  real,
  index,
  vector,
} from "drizzle-orm/pg-core";

export const PLAN_LIMITS = {
  free: 300,
  hobby: 1500,
  pro: 5000,
  team: 10000,
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  memoryCount: integer("memory_count").notNull().default(0),
  memoryLimit: integer("memory_limit").notNull().default(300),
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
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
  ],
);

export const memoryRelations = pgTable("memory_relations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceId: uuid("source_id").notNull(),
  targetId: uuid("target_id").notNull(),
  relationType: text("relation_type").notNull(),
  strength: real("strength"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKeyRow = typeof apiKeys.$inferInsert;
export type MemoryRow = typeof memories.$inferSelect;
export type NewMemoryRow = typeof memories.$inferInsert;
export type MemoryRelationRow = typeof memoryRelations.$inferSelect;
export type NewMemoryRelationRow = typeof memoryRelations.$inferInsert;
