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
  workspaceId: string;
  keyId: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

export type MemoryCategory = "preference" | "fact" | "decision" | "context";

export type MemorySource = "mcp" | "web" | "api" | "openclaw";
export type MemoryType = "member" | "user" | "document" | "company";
export type DocumentSourceType =
  | "pdf"
  | "markdown"
  | "text"
  | "docx"
  | "html"
  | "url"
  | "csv"
  | "png"
  | "jpg"
  | "jpeg"
  | "webp"
  | "tiff";
export type ContextVaultSearchMode = "memories" | "documents" | "hybrid";
export type ContextVaultDocumentStatus =
  | "pending"
  | "processing"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled";

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
  workspaceId?: string;
  scope?: string;
  memoryType?: MemoryType;
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
  id?: string;
  jobId?: string;
  status: "saved" | "updated" | "extended" | "duplicate" | "accepted";
  superseded?: string;
  existingId?: string;
  message?: string;
  reservedSlots?: number;
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
  memoryType?: MemoryType;
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

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type InvitableWorkspaceRole = Exclude<WorkspaceRole, "owner">;

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  billingOwnerPlan: PlanType | null;
  createdAt: Date;
}

export interface ListWorkspacesResponse {
  workspaces: Workspace[];
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface CreateWorkspaceResponse {
  workspace: Workspace;
}

export interface InviteWorkspaceMemberRequest {
  email: string;
  role?: InvitableWorkspaceRole;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: InvitableWorkspaceRole;
  expiresAt: Date;
  createdAt: Date;
}

export interface InviteWorkspaceMemberResponse {
  invitation: WorkspaceInvitation;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  name: string | null;
  email: string;
  image: string | null;
}

export interface ListWorkspaceTeamResponse {
  currentUserRole: WorkspaceRole;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

export interface UpdateWorkspaceMemberRequest {
  role: InvitableWorkspaceRole;
}

export interface UpdateWorkspaceMemberResponse {
  member: {
    id: string;
    userId: string;
    role: WorkspaceRole;
    createdAt: Date;
  };
}

export interface AcceptWorkspaceInvitationRequest {
  token: string;
}

export interface AcceptWorkspaceInvitationResponse {
  success: boolean;
  workspaceId: string;
}

export interface IngestContextVaultDocumentRequest {
  workspaceId: string;
  vaultId?: string;
  title: string;
  content?: string;
  sourceType?: DocumentSourceType;
  scope?: string;
  project?: string;
  mimeType?: string;
  originalFilename?: string;
  uri?: string;
  crawlSubpages?: boolean;
  priorityPageLimit?: number;
  subpageTarget?: string[];
  category?: MemoryCategory;
}

export interface UploadContextVaultDocumentRequest {
  workspaceId: string;
  vaultId?: string;
  title: string;
  file: Blob;
  filename?: string;
  sourceType?: DocumentSourceType;
  scope?: string;
  project?: string;
  content?: string;
}

export interface ContextVaultDocument {
  id: string;
  title: string | null;
  sourceType: string;
  status: ContextVaultDocumentStatus;
  chunkCount: number;
  extractedCount: number;
  totalChunks: number;
  processedChunks: number;
  processingPhase: string | null;
  heartbeatAt: Date | null;
  scope: string | null;
  project: string | null;
  createdAt: Date;
  completedAt: Date | null;
  error: string | null;
  publicUrl: string | null;
}

export interface ListContextVaultDocumentsResponse {
  documents: ContextVaultDocument[];
}

export interface IngestContextVaultDocumentResponse {
  document: ContextVaultDocument;
  chunkCount: number;
  extractedCount: number;
  status: "accepted";
  message: string;
}

export interface CancelContextVaultDocumentResponse {
  cancelled: boolean;
  documentId: string;
}

export interface DeleteContextVaultDocumentResponse {
  deleted: boolean;
  documentId: string;
  deletedMemoryCount: number;
  preservedMemoryCount: number;
}

export interface ListContextVaultMemoriesRequest {
  workspaceId: string;
  vaultId?: string;
  scope?: string;
  project?: string;
  projects?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateContextVaultMemoryRequest {
  workspaceId: string;
  vaultId?: string;
  content: string;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
}

export interface CreateContextVaultMemoryResponse {
  memory: ContextVaultMemory;
}

export interface DeleteContextVaultMemoryResponse {
  success: boolean;
  memoryId: string;
}

export interface ContextVaultMemory {
  id: string;
  content: string;
  category: string | null;
  scope: string | null;
  project: string | null;
  memoryType: "document" | "company";
  createdAt: Date;
  sourceId: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

export interface ListContextVaultMemoriesResponse {
  memories: ContextVaultMemory[];
  total: number;
  hasMore: boolean;
}

export interface ListContextVaultDocumentMemoriesResponse {
  document: {
    id: string;
    title: string | null;
    publicUrl: string | null;
  };
  memories: ContextVaultMemory[];
  total: number;
}

export interface ContextVaultMemoryFeedbackRequest {
  workspaceId: string;
  vaultId?: string;
  type: FeedbackType;
  context?: string;
}

export interface CorrectContextVaultMemoryRequest {
  workspaceId: string;
  vaultId?: string;
  type?: "wrong" | "outdated" | "incomplete";
  correctedContent: string;
  reason?: string;
  correctedChunkContent?: string;
  evidenceChunkId?: string;
}

export interface CorrectContextVaultMemoryResponse {
  success: boolean;
  memory: ContextVaultMemory;
  updatedChunkCount: number;
}

export interface ContextVaultMemoryEvidence {
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  sectionPath: string | null;
  pageNumber: number | null;
  content: string;
  title: string | null;
  quote: string | null;
  confidence: number | null;
}

export interface ListContextVaultMemoryEvidenceResponse {
  evidence: ContextVaultMemoryEvidence[];
}

export interface ContextVaultHierarchyProject {
  name: string;
  value: string;
  count: number;
}

export interface ContextVaultHierarchyScope {
  name: string;
  count: number;
  projects: ContextVaultHierarchyProject[];
}

export interface ContextVaultHierarchyResponse {
  global: {
    count: number;
    projects: ContextVaultHierarchyProject[];
  };
  scopes: ContextVaultHierarchyScope[];
}

export interface SearchContextVaultRequest {
  workspaceId: string;
  vaultId?: string;
  query: string;
  mode?: ContextVaultSearchMode;
  scope?: string;
  scopes?: string[];
  project?: string;
  limit?: number;
}

export interface ContextVaultSearchChunk {
  id: string;
  sourceId: string;
  title: string | null;
  sourceType: string;
  sectionPath: string | null;
  scope: string | null;
  project: string | null;
  chunkIndex: number;
  content: string;
  contextualContent: string;
  relevance: number;
  createdAt: Date;
}

export interface ContextVaultSearchMemory {
  id: string;
  content: string;
  category: string | null;
  scope: string | null;
  project: string | null;
  memoryType: "document" | "company";
  createdAt: Date;
  evidence: Array<{
    sourceId: string;
    chunkId: string;
    quote: string | null;
    confidence: number | null;
    title: string | null;
    sectionPath: string | null;
    chunkIndex: number;
  }>;
}

export interface SearchContextVaultResponse {
  mode: ContextVaultSearchMode;
  found: number;
  chunks: ContextVaultSearchChunk[];
  memories: ContextVaultSearchMemory[];
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

export type PlanType = "free" | "hobby" | "pro" | "ultimate";

export type SubscriptionStatus =
  | "active"
  | "on_hold"
  | "cancelled"
  | "expired"
  | "failed";

export interface Subscription {
  id: string;
  userId?: string;
  workspaceId: string;
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
  workspaceId: string;
  workspaceName?: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface CreateApiKeyRequest {
  name: string;
  workspaceId?: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  workspaceId: string;
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
