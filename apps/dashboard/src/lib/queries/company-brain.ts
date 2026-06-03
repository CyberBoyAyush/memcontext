import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";

type DocumentSourceType =
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
type CompanyBrainDocumentStatus =
  | "pending"
  | "processing"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  createdAt: string;
}

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type InvitableWorkspaceRole = "admin" | "member" | "viewer";

export interface WorkspaceMember {
  id: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: InvitableWorkspaceRole;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceTeamResponse {
  currentUserRole: WorkspaceRole;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
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
  heartbeatAt: string | null;
  scope: string | null;
  project: string | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  publicUrl: string | null;
}

export interface CancelCompanyBrainDocumentResponse {
  cancelled: boolean;
  documentId: string;
}

export interface CompanyBrainSearchResponse {
  mode: "memories" | "documents" | "hybrid";
  found: number;
  chunks: Array<{
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
    createdAt: string;
  }>;
  memories: Array<{
    id: string;
    content: string;
    category: string | null;
    scope: string | null;
    project: string | null;
    createdAt: string;
    evidence: Array<{
      sourceId: string;
      chunkId: string;
      quote: string | null;
      confidence: number | null;
      title: string | null;
      sectionPath: string | null;
      chunkIndex: number;
    }>;
  }>;
}

export interface CompanyBrainMemory {
  id: string;
  content: string;
  category: string | null;
  scope: string | null;
  project: string | null;
  createdAt: string;
  sourceId?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
}

export interface CompanyBrainMemoriesResponse {
  memories: CompanyBrainMemory[];
  total: number;
  hasMore: boolean;
}

export interface CompanyBrainDocumentMemoriesResponse {
  document: { id: string; title: string | null; publicUrl?: string | null };
  memories: CompanyBrainMemory[];
  total: number;
}

export interface CompanyBrainEvidence {
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

export interface CorrectCompanyBrainMemoryResponse {
  success: boolean;
  memory: CompanyBrainMemory;
  updatedChunkCount: number;
}

export interface CompanyBrainEvidenceResponse {
  evidence: CompanyBrainEvidence[];
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
  global: { count: number; projects: CompanyBrainHierarchyProject[] };
  scopes: CompanyBrainHierarchyScope[];
}

export const workspacesQueryOptions = () =>
  queryOptions({
    queryKey: ["workspaces"] as const,
    queryFn: () => api.get<{ workspaces: Workspace[] }>("/api/workspaces"),
  });

export const companyBrainHierarchyQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryKey: ["company-brain-hierarchy", workspaceId] as const,
    queryFn: () =>
      api.get<CompanyBrainHierarchyResponse>(
        `/api/company-brain/hierarchy?workspaceId=${workspaceId}`,
      ),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

export const companyBrainDocumentMemoriesQueryOptions = (params: {
  workspaceId?: string;
  documentId?: string;
}) =>
  queryOptions({
    queryKey: [
      "company-brain-document-memories",
      params.workspaceId,
      params.documentId,
    ] as const,
    queryFn: () =>
      api.get<CompanyBrainDocumentMemoriesResponse>(
        `/api/company-brain/documents/${params.documentId}/memories?workspaceId=${params.workspaceId}`,
      ),
    enabled: !!params.workspaceId && !!params.documentId,
  });

export const companyBrainMemoryEvidenceQueryOptions = (params: {
  workspaceId?: string;
  memoryId?: string;
}) =>
  queryOptions({
    queryKey: [
      "company-brain-memory-evidence",
      params.workspaceId,
      params.memoryId,
    ] as const,
    queryFn: () =>
      api.get<CompanyBrainEvidenceResponse>(
        `/api/company-brain/memories/${params.memoryId}/evidence?workspaceId=${params.workspaceId}`,
      ),
    enabled: !!params.workspaceId && !!params.memoryId,
  });

export const companyBrainMemoriesQueryOptions = (params: {
  workspaceId?: string;
  scope?: string;
  projects?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}) =>
  queryOptions({
    queryKey: ["company-brain-memories", params] as const,
    queryFn: () => {
      const searchParams = new URLSearchParams({
        workspaceId: params.workspaceId ?? "",
      });
      if (params.scope) searchParams.set("scope", params.scope);
      if (params.projects && params.projects.length > 0) {
        searchParams.set("projects", params.projects.join(","));
      }
      if (params.search) searchParams.set("search", params.search);
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.offset) searchParams.set("offset", String(params.offset));
      return api.get<CompanyBrainMemoriesResponse>(
        `/api/company-brain/memories?${searchParams.toString()}`,
      );
    },
    enabled: !!params.workspaceId,
  });

export const companyBrainDocumentsQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryKey: ["company-brain-documents", workspaceId] as const,
    queryFn: () =>
      api.get<{ documents: CompanyBrainDocument[] }>(
        `/api/company-brain/documents?workspaceId=${workspaceId}`,
      ),
    enabled: !!workspaceId,
    refetchInterval: 3000,
  });

export const companyBrainSearchQueryOptions = (params: {
  workspaceId?: string;
  query: string;
  mode: "memories" | "documents" | "hybrid";
  scope?: string;
  scopes?: string[];
  project?: string;
}) =>
  queryOptions({
    queryKey: ["company-brain-search", params] as const,
    queryFn: () => {
      const searchParams = new URLSearchParams({
        workspaceId: params.workspaceId ?? "",
        query: params.query,
        mode: params.mode,
      });
      if (params.scope) searchParams.set("scope", params.scope);
      if (params.scopes && params.scopes.length > 0) {
        searchParams.set("scopes", params.scopes.join(","));
      }
      if (params.project) searchParams.set("project", params.project);
      return api.get<CompanyBrainSearchResponse>(
        `/api/company-brain/search?${searchParams.toString()}`,
      );
    },
    enabled: !!params.workspaceId && params.query.trim().length > 0,
  });

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<{ workspace: Workspace }>("/api/workspaces", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export type VaultFeedbackType =
  | "helpful"
  | "not_helpful"
  | "outdated"
  | "wrong";

export function useSubmitVaultMemoryFeedback() {
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      memoryId: string;
      type: VaultFeedbackType;
      context?: string;
    }) =>
      api.post<{ success: boolean }>(
        `/api/company-brain/memories/${data.memoryId}/feedback`,
        {
          workspaceId: data.workspaceId,
          type: data.type,
          context: data.context,
        },
      ),
  });
}

export function useCorrectVaultMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      memoryId: string;
      type?: "wrong" | "outdated" | "incomplete";
      correctedContent: string;
      reason?: string;
      correctedChunkContent?: string;
      evidenceChunkId?: string;
    }) =>
      api.post<CorrectCompanyBrainMemoryResponse>(
        `/api/company-brain/memories/${data.memoryId}/correction`,
        {
          workspaceId: data.workspaceId,
          type: data.type,
          correctedContent: data.correctedContent,
          reason: data.reason,
          correctedChunkContent: data.correctedChunkContent,
          evidenceChunkId: data.evidenceChunkId,
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["company-brain-memories"] });
      queryClient.invalidateQueries({
        queryKey: ["company-brain-document-memories"],
      });
      queryClient.invalidateQueries({ queryKey: ["company-brain-search"] });
      queryClient.invalidateQueries({
        queryKey: [
          "company-brain-memory-evidence",
          variables.workspaceId,
          variables.memoryId,
        ],
      });
    },
  });
}

export function useIngestCompanyBrainDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      title: string;
      content?: string;
      uri?: string;
      sourceType?: DocumentSourceType;
      crawlSubpages?: boolean;
      priorityPageLimit?: number;
      subpageTarget?: string[];
      scope?: string;
      project?: string;
    }) => api.post("/api/company-brain/documents", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["company-brain-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["company-brain-search"] });
    },
  });
}

export function useUploadCompanyBrainDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      title: string;
      file: File;
      sourceType?: DocumentSourceType;
      scope?: string;
      project?: string;
      content?: string;
    }) => {
      const formData = new FormData();
      formData.set("workspaceId", data.workspaceId);
      formData.set("title", data.title);
      formData.set("file", data.file);
      if (data.sourceType) formData.set("sourceType", data.sourceType);
      if (data.scope) formData.set("scope", data.scope);
      if (data.project) formData.set("project", data.project);
      if (data.content) formData.set("content", data.content);
      return api.postForm("/api/company-brain/documents/upload", formData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["company-brain-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["company-brain-search"] });
    },
  });
}

export function useCancelCompanyBrainDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspaceId: string; documentId: string }) =>
      api.post<CancelCompanyBrainDocumentResponse>(
        `/api/company-brain/documents/${data.documentId}/cancel`,
        {},
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["company-brain-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["company-brain-search"] });
    },
  });
}

export function useDeleteCompanyBrainDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspaceId: string; documentId: string }) =>
      api.delete(`/api/company-brain/documents/${data.documentId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["company-brain-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["company-brain-search"] });
    },
  });
}

export function useInviteWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      email: string;
      role: InvitableWorkspaceRole;
    }) =>
      api.post<{
        invitation: WorkspaceInvitation;
      }>(`/api/workspaces/${data.workspaceId}/invitations`, {
        email: data.email,
        role: data.role,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-team", variables.workspaceId],
      });
    },
  });
}

export const workspaceTeamQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryKey: ["workspace-team", workspaceId] as const,
    queryFn: () =>
      api.get<WorkspaceTeamResponse>(`/api/workspaces/${workspaceId}/team`),
    enabled: !!workspaceId,
  });

export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      memberId: string;
      role: InvitableWorkspaceRole;
    }) =>
      api.patch<{ member: WorkspaceMember }>(
        `/api/workspaces/${data.workspaceId}/members/${data.memberId}`,
        { role: data.role },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-team", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { workspaceId: string; memberId: string }) =>
      api.delete<{ success: boolean }>(
        `/api/workspaces/${data.workspaceId}/members/${data.memberId}`,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-team", variables.workspaceId],
      });
    },
  });
}

export function useRevokeWorkspaceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { workspaceId: string; invitationId: string }) =>
      api.delete<{ success: boolean }>(
        `/api/workspaces/${data.workspaceId}/invitations/${data.invitationId}`,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-team", variables.workspaceId],
      });
    },
  });
}

export function useAcceptWorkspaceInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      api.post<{ success: boolean; workspaceId: string }>(
        "/api/workspaces/invitations/accept",
        { token },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
