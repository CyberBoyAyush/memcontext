export type MemoryCategory = "preference" | "fact" | "decision" | "context";

export type MemorySource = "mcp" | "web" | "api" | "openclaw";
export type MemoryType = "user" | "document" | "company";
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
export type CompanyBrainSearchMode = "memories" | "documents" | "hybrid";
export type CompanyBrainDocumentStatus =
  | "pending"
  | "processing"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled";

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
  memoryType?: "user" | "document" | "company";
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

export interface IngestCompanyBrainDocumentRequest {
  workspaceId: string;
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

export interface CompanyBrainDocument {
  id: string;
  title: string | null;
  sourceType: string;
  status: CompanyBrainDocumentStatus;
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

export interface ListCompanyBrainDocumentsResponse {
  documents: CompanyBrainDocument[];
}

export interface IngestCompanyBrainDocumentResponse {
  document: CompanyBrainDocument;
  chunkCount: number;
  extractedCount: number;
  status: "accepted";
  message: string;
}

export interface CancelCompanyBrainDocumentResponse {
  cancelled: boolean;
  documentId: string;
}

export interface DeleteCompanyBrainDocumentResponse {
  deleted: boolean;
  documentId: string;
  deletedMemoryCount: number;
  preservedMemoryCount: number;
}

export interface ListCompanyBrainMemoriesRequest {
  workspaceId: string;
  scope?: string;
  project?: string;
  projects?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCompanyBrainMemoryRequest {
  workspaceId: string;
  content: string;
  category?: MemoryCategory;
  scope?: string;
  project?: string;
}

export interface CreateCompanyBrainMemoryResponse {
  memory: CompanyBrainMemory;
}

export interface DeleteCompanyBrainMemoryResponse {
  success: boolean;
  memoryId: string;
}

export interface CompanyBrainMemory {
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

export interface ListCompanyBrainMemoriesResponse {
  memories: CompanyBrainMemory[];
  total: number;
  hasMore: boolean;
}

export interface ListCompanyBrainDocumentMemoriesResponse {
  document: {
    id: string;
    title: string | null;
    publicUrl: string | null;
  };
  memories: CompanyBrainMemory[];
  total: number;
}

export interface CompanyBrainMemoryFeedbackRequest {
  workspaceId: string;
  type: FeedbackType;
  context?: string;
}

export interface CorrectCompanyBrainMemoryRequest {
  workspaceId: string;
  type?: "wrong" | "outdated" | "incomplete";
  correctedContent: string;
  reason?: string;
  correctedChunkContent?: string;
  evidenceChunkId?: string;
}

export interface CorrectCompanyBrainMemoryResponse {
  success: boolean;
  memory: CompanyBrainMemory;
  updatedChunkCount: number;
}

export interface CompanyBrainMemoryEvidence {
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

export interface ListCompanyBrainMemoryEvidenceResponse {
  evidence: CompanyBrainMemoryEvidence[];
}

export interface CompanyBrainHierarchyProject {
  name: string;
  value: string;
  count: number;
}

export interface CompanyBrainHierarchyScope {
  name: string;
  count: number;
  projects: CompanyBrainHierarchyProject[];
}

export interface CompanyBrainHierarchyResponse {
  global: {
    count: number;
    projects: CompanyBrainHierarchyProject[];
  };
  scopes: CompanyBrainHierarchyScope[];
}

export interface SearchCompanyBrainRequest {
  workspaceId: string;
  query: string;
  mode?: CompanyBrainSearchMode;
  scope?: string;
  scopes?: string[];
  project?: string;
  limit?: number;
}

export interface CompanyBrainSearchChunk {
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

export interface CompanyBrainSearchMemory {
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

export interface SearchCompanyBrainResponse {
  mode: CompanyBrainSearchMode;
  found: number;
  chunks: CompanyBrainSearchChunk[];
  memories: CompanyBrainSearchMemory[];
}

export type ContextVaultDocument = CompanyBrainDocument;
export type ListContextVaultDocumentsResponse =
  ListCompanyBrainDocumentsResponse;
export type IngestContextVaultDocumentRequest =
  IngestCompanyBrainDocumentRequest;
export type IngestContextVaultDocumentResponse =
  IngestCompanyBrainDocumentResponse;
export type CancelContextVaultDocumentResponse =
  CancelCompanyBrainDocumentResponse;
export type DeleteContextVaultDocumentResponse =
  DeleteCompanyBrainDocumentResponse;
export type ListContextVaultMemoriesRequest = ListCompanyBrainMemoriesRequest;
export type CreateContextVaultMemoryRequest = CreateCompanyBrainMemoryRequest;
export type CreateContextVaultMemoryResponse = CreateCompanyBrainMemoryResponse;
export type DeleteContextVaultMemoryResponse = DeleteCompanyBrainMemoryResponse;
export type ContextVaultMemory = CompanyBrainMemory;
export type ListContextVaultMemoriesResponse = ListCompanyBrainMemoriesResponse;
export type ListContextVaultDocumentMemoriesResponse =
  ListCompanyBrainDocumentMemoriesResponse;
export type ContextVaultMemoryFeedbackRequest =
  CompanyBrainMemoryFeedbackRequest;
export type CorrectContextVaultMemoryRequest = CorrectCompanyBrainMemoryRequest;
export type CorrectContextVaultMemoryResponse =
  CorrectCompanyBrainMemoryResponse;
export type ContextVaultMemoryEvidence = CompanyBrainMemoryEvidence;
export type ListContextVaultMemoryEvidenceResponse =
  ListCompanyBrainMemoryEvidenceResponse;
export type ContextVaultHierarchyResponse = CompanyBrainHierarchyResponse;
export type SearchContextVaultRequest = SearchCompanyBrainRequest;
export type SearchContextVaultResponse = SearchCompanyBrainResponse;

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
