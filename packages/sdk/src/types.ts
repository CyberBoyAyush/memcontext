export interface ApiError {
  error: string;
  code?: string;
  requestId?: string;
  errorId?: string;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database?: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface CachedApiKeyData {
  userId: string;
  keyId: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

export type MemoryCategory = "preference" | "fact" | "decision" | "context";

export type MemorySource = "mcp" | "web" | "api" | "openclaw";

export type RelationType = "extends" | "similar";

export type FeedbackType = "helpful" | "not_helpful" | "outdated" | "wrong";

export type RelationshipClassification =
  | "update"
  | "extend"
  | "similar"
  | "noop";

export type MemoryGraphLinkType =
  | "extends"
  | "similar"
  | "shared-root"
  | "shared-project"
  | "shared-category";

export interface Memory {
  id: string;
  userId: string;
  scope?: string;
  content: string;
  category?: MemoryCategory;
  project?: string;
  source: MemorySource;
  isCurrent: boolean;
  supersedesId?: string;
  rootId?: string;
  version: number;
  deletedAt?: Date;
  validFrom?: Date;
  validUntil?: Date;
  createdAt: Date;
}

export interface MemoryRelation {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: RelationType;
  strength?: number;
  createdAt: Date;
}

export interface SaveMemoryRequest {
  content: string;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  source?: MemorySource;
  validUntil?: string;
}

export interface SaveMemoryResponse {
  id: string;
  status: "saved" | "updated" | "extended" | "duplicate";
  superseded?: string;
  existingId?: string;
}

export interface SearchMemoryRequest {
  query: string;
  limit?: number;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  threshold?: number;
}

export interface ListMemoriesRequest {
  limit?: number;
  offset?: number;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  search?: string;
}

export interface MemoryWithRelevance {
  id: string;
  content: string;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  relevance: number;
  createdAt: Date;
}

export interface ListMemoryItem {
  id: string;
  content: string;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
  source: MemorySource;
  validFrom?: Date;
  validUntil?: Date;
  version: number;
  createdAt: Date;
}

export interface ListMemoriesResponse {
  memories: ListMemoryItem[];
  total: number;
  hasMore: boolean;
}

export interface UpdateMemoryRequest {
  content?: string;
  category?: MemoryCategory;
  project?: string;
}

export interface UpdateMemoryResultMemory {
  id: string;
  content: string;
  category: MemoryCategory | null;
  scope: string | null;
  project: string | null;
}

export interface UpdateMemoryResponse {
  success: boolean;
  memory?: UpdateMemoryResultMemory;
  superseded?: string;
  relatedTo?: string;
  error?: string;
}

export interface SuccessResponse {
  success: boolean;
}

export interface MemoryProfile {
  static: string[];
  dynamic: string[];
}

export interface MemoryHistoryResponse {
  current: Memory;
  history: Memory[];
}

export interface MemoryFeedbackRequest {
  type: FeedbackType;
  context?: string;
}

export interface MemoryFeedbackResponse {
  success: boolean;
}

export interface SearchMemoryResponse {
  found: number;
  memories: MemoryWithRelevance[];
}

export interface MemoryGraphNode {
  id: string;
  label: string;
  content: string;
  category: MemoryCategory | null;
  scope: string | null;
  project: string | null;
  rootId: string | null;
  createdAt: string;
  degree: number;
}

export interface MemoryGraphLink {
  id: string;
  source: string;
  target: string;
  type: MemoryGraphLinkType;
  strength: number | null;
  derived: boolean;
}

export interface MemoryGraphResponse {
  nodes: MemoryGraphNode[];
  links: MemoryGraphLink[];
  meta: {
    totalNodes: number;
    totalLinks: number;
    relationLinks: number;
    derivedLinks: number;
  };
}

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type PlanType = "free" | "hobby" | "pro";

export type SubscriptionStatus =
  | "active"
  | "on_hold"
  | "cancelled"
  | "expired"
  | "failed";

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  memoryCount: number;
  memoryLimit: number;
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
  status: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  key: string;
  createdAt: Date;
}

export interface ListApiKeysResponse {
  keys: ApiKey[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  createdAt: Date;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

export interface AdminUserDetails extends AdminUser {
  apiKeyCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalMemories: number;
  usersByPlan: Record<string, number>;
}

export interface ListUsersResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdatePlanRequest {
  plan: PlanType;
}

export interface UpdatePlanResponse {
  success: boolean;
  previousPlan: string;
  newPlan: string;
  newLimit: number;
}

export interface UserUsageStats {
  searchesLast24h: number;
  searchesThisMonth: number;
  searchesAllTime: number;
  lastActivityAt: string | null;
}
