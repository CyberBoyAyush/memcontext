export type MemoryCategory = "preference" | "fact" | "decision" | "context";

export type MemorySource = "mcp" | "web" | "api" | "openclaw";

export type RelationType = "extends" | "similar";

export type MemoryGraphLinkType =
  | RelationType
  | "shared-root"
  | "shared-project"
  | "shared-category";

export type FeedbackType = "helpful" | "not_helpful" | "outdated" | "wrong";

export type RelationshipClassification =
  | "update"
  | "extend"
  | "similar"
  | "noop";

export interface Memory {
  id: string;
  userId: string;
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
  project?: string;
  source?: MemorySource;
  validUntil?: string;
}

export interface SaveMemoryResponse {
  id: string;
  status: "saved" | "updated" | "extended" | "duplicate" | "limit_exceeded";
  superseded?: string;
  existingId?: string;
  current?: number;
  limit?: number;
}

export interface SearchMemoryRequest {
  query: string;
  limit?: number;
  category?: MemoryCategory;
  project?: string;
  threshold?: number;
}

export interface MemoryWithRelevance {
  id: string;
  content: string;
  category?: MemoryCategory;
  project?: string;
  relevance: number;
  createdAt: Date;
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
  category: string | null;
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
