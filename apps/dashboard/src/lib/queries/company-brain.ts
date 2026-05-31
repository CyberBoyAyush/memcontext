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

export interface CompanyBrainSearchResponse {
  mode: "memories" | "documents" | "hybrid";
  found: number;
  chunks: Array<{
    id: string;
    sourceId: string;
    title: string | null;
    sourceType: string;
    sectionPath: string | null;
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
      api.post(`/api/company-brain/documents/${data.documentId}/cancel`, {}),
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
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      email: string;
      role: "admin" | "member" | "viewer";
    }) =>
      api.post<{
        invitation: {
          id: string;
          email: string;
          role: string;
          expiresAt: string;
        };
        token: string;
      }>(`/api/workspaces/${data.workspaceId}/invitations`, {
        email: data.email,
        role: data.role,
      }),
  });
}
