export type MemoryCategory = "preference" | "fact" | "decision" | "context";

export type MemorySource = "mcp" | "web" | "api";

export type RelationType = "extends" | "similar";

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
}

export interface MemoryWithRelevance {
  id: string;
  content: string;
  category?: MemoryCategory;
  project?: string;
  relevance: number;
  createdAt: Date;
}

export interface SearchMemoryResponse {
  found: number;
  memories: MemoryWithRelevance[];
}
