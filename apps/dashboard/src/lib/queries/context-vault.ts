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
type ContextVaultDocumentStatus =
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
  billingOwnerPlan: "free" | "hobby" | "pro" | "ultimate" | null;
  createdAt: string;
}

export interface Vault {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
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
  billingOwnerUserId: string | null;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
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
  heartbeatAt: string | null;
  scope: string | null;
  project: string | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  publicUrl: string | null;
}

export interface CancelContextVaultDocumentResponse {
  cancelled: boolean;
  documentId: string;
}

export interface ContextVaultSearchResponse {
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
    memoryType: "document" | "company";
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

export interface ContextVaultMemory {
  id: string;
  vaultId?: string | null;
  content: string;
  category: string | null;
  scope: string | null;
  project: string | null;
  memoryType: "document" | "company";
  createdAt: string;
  sourceId?: string | null;
  sourceTitle?: string | null;
  sourceUrl?: string | null;
}

export interface ContextVaultMemoriesResponse {
  memories: ContextVaultMemory[];
  total: number;
  hasMore: boolean;
}

export interface ContextVaultDocumentMemoriesResponse {
  document: { id: string; title: string | null; publicUrl?: string | null };
  memories: ContextVaultMemory[];
  total: number;
}

export interface ContextVaultEvidence {
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

export interface CorrectContextVaultMemoryResponse {
  success: boolean;
  memory: ContextVaultMemory;
  updatedChunkCount: number;
}

export interface DeleteContextVaultMemoryResponse {
  success: boolean;
  memoryId: string;
}

export interface ContextVaultEvidenceResponse {
  evidence: ContextVaultEvidence[];
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
  global: { count: number; projects: ContextVaultHierarchyProject[] };
  scopes: ContextVaultHierarchyScope[];
}

export const workspacesQueryOptions = () =>
  queryOptions({
    queryKey: ["workspaces"] as const,
    queryFn: () => api.get<{ workspaces: Workspace[] }>("/api/workspaces"),
  });

export const contextVaultHierarchyQueryOptions = (
  workspaceId?: string,
  vaultId?: string,
) =>
  queryOptions({
    queryKey: ["context-vault-hierarchy", workspaceId, vaultId] as const,
    queryFn: () =>
      api.get<ContextVaultHierarchyResponse>(
        `/api/context-vault/hierarchy?workspaceId=${workspaceId}${vaultId ? `&vaultId=${vaultId}` : ""}`,
      ),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

export const contextVaultVaultsQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryKey: ["context-vault-vaults", workspaceId] as const,
    queryFn: () =>
      api.get<{ vaults: Vault[] }>(
        `/api/context-vault/vaults?workspaceId=${workspaceId}`,
      ),
    enabled: !!workspaceId,
  });

export const contextVaultDocumentMemoriesQueryOptions = (params: {
  workspaceId?: string;
  vaultId?: string;
  documentId?: string;
}) =>
  queryOptions({
    queryKey: [
      "context-vault-document-memories",
      params.workspaceId,
      params.vaultId,
      params.documentId,
    ] as const,
    queryFn: () => {
      const searchParams = new URLSearchParams({
        workspaceId: params.workspaceId ?? "",
      });
      if (params.vaultId) searchParams.set("vaultId", params.vaultId);
      return api.get<ContextVaultDocumentMemoriesResponse>(
        `/api/context-vault/documents/${params.documentId}/memories?${searchParams.toString()}`,
      );
    },
    enabled: !!params.workspaceId && !!params.documentId,
  });

export const contextVaultMemoryEvidenceQueryOptions = (params: {
  workspaceId?: string;
  vaultId?: string;
  memoryId?: string;
}) =>
  queryOptions({
    queryKey: [
      "context-vault-memory-evidence",
      params.workspaceId,
      params.vaultId,
      params.memoryId,
    ] as const,
    queryFn: () => {
      const searchParams = new URLSearchParams({
        workspaceId: params.workspaceId ?? "",
      });
      if (params.vaultId) searchParams.set("vaultId", params.vaultId);
      return api.get<ContextVaultEvidenceResponse>(
        `/api/context-vault/memories/${params.memoryId}/evidence?${searchParams.toString()}`,
      );
    },
    enabled: !!params.workspaceId && !!params.memoryId,
  });

export const contextVaultMemoriesQueryOptions = (params: {
  workspaceId?: string;
  scope?: string;
  projects?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
}) =>
  queryOptions({
    queryKey: ["context-vault-memories", params] as const,
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
      if (params.sort) searchParams.set("sort", params.sort);
      return api.get<ContextVaultMemoriesResponse>(
        `/api/context-vault/memories?${searchParams.toString()}`,
      );
    },
    enabled: !!params.workspaceId,
  });

export const contextVaultDocumentsQueryOptions = (
  workspaceId?: string,
  vaultId?: string,
) =>
  queryOptions({
    queryKey: ["context-vault-documents", workspaceId, vaultId] as const,
    queryFn: () =>
      api.get<{ documents: ContextVaultDocument[] }>(
        `/api/context-vault/documents?workspaceId=${workspaceId}${vaultId ? `&vaultId=${vaultId}` : ""}`,
      ),
    enabled: !!workspaceId,
    refetchInterval: 3000,
  });

export const contextVaultSearchQueryOptions = (params: {
  workspaceId?: string;
  vaultId?: string;
  query: string;
  mode: "memories" | "documents" | "hybrid";
  scope?: string;
  scopes?: string[];
  project?: string;
}) =>
  queryOptions({
    queryKey: ["context-vault-search", params] as const,
    queryFn: () => {
      const searchParams = new URLSearchParams({
        workspaceId: params.workspaceId ?? "",
        query: params.query,
        mode: params.mode,
      });
      if (params.scope) searchParams.set("scope", params.scope);
      if (params.vaultId) searchParams.set("vaultId", params.vaultId);
      if (params.scopes && params.scopes.length > 0) {
        searchParams.set("scopes", params.scopes.join(","));
      }
      if (params.project) searchParams.set("project", params.project);
      return api.get<ContextVaultSearchResponse>(
        `/api/context-vault/search?${searchParams.toString()}`,
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
      vaultId?: string;
      memoryId: string;
      type: VaultFeedbackType;
      context?: string;
    }) =>
      api.post<{ success: boolean }>(
        `/api/context-vault/memories/${data.memoryId}/feedback`,
        {
          workspaceId: data.workspaceId,
          vaultId: data.vaultId,
          type: data.type,
          context: data.context,
        },
      ),
  });
}

export function useCreateContextVaultMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      vaultId?: string;
      content: string;
      category?: "preference" | "fact" | "decision" | "context";
      scope?: string;
      project?: string;
    }) =>
      api.post<{ memory: ContextVaultMemory }>(
        "/api/context-vault/memories",
        data,
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["context-vault-hierarchy", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["context-vault-memories"] });
      queryClient.invalidateQueries({ queryKey: ["context-vault-search"] });
    },
  });
}

export function useDeleteContextVaultMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspaceId: string; vaultId?: string; memoryId: string }) => {
      const searchParams = new URLSearchParams({ workspaceId: data.workspaceId });
      if (data.vaultId) searchParams.set("vaultId", data.vaultId);
      return api.delete<DeleteContextVaultMemoryResponse>(
        `/api/context-vault/memories/${data.memoryId}?${searchParams.toString()}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["context-vault-hierarchy", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["context-vault-memories"] });
      queryClient.invalidateQueries({ queryKey: ["context-vault-search"] });
    },
  });
}

export function useCorrectVaultMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      vaultId?: string;
      memoryId: string;
      type?: "wrong" | "outdated" | "incomplete";
      correctedContent: string;
      reason?: string;
      correctedChunkContent?: string;
      evidenceChunkId?: string;
    }) =>
      api.post<CorrectContextVaultMemoryResponse>(
        `/api/context-vault/memories/${data.memoryId}/correction`,
        {
          workspaceId: data.workspaceId,
          vaultId: data.vaultId,
          type: data.type,
          correctedContent: data.correctedContent,
          reason: data.reason,
          correctedChunkContent: data.correctedChunkContent,
          evidenceChunkId: data.evidenceChunkId,
        },
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["context-vault-memories"] });
      queryClient.invalidateQueries({
        queryKey: ["context-vault-document-memories"],
      });
      queryClient.invalidateQueries({ queryKey: ["context-vault-search"] });
      queryClient.invalidateQueries({
        queryKey: [
          "context-vault-memory-evidence",
          variables.workspaceId,
          variables.vaultId,
          variables.memoryId,
        ],
      });
    },
  });
}

export function useIngestContextVaultDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      vaultId?: string;
      title: string;
      content?: string;
      uri?: string;
      sourceType?: DocumentSourceType;
      crawlSubpages?: boolean;
      priorityPageLimit?: number;
      subpageTarget?: string[];
      scope?: string;
      project?: string;
    }) => api.post("/api/context-vault/documents", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["context-vault-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["context-vault-search"] });
    },
  });
}

export function useUploadContextVaultDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      workspaceId: string;
      vaultId?: string;
      title: string;
      file: File;
      sourceType?: DocumentSourceType;
      scope?: string;
      project?: string;
      content?: string;
    }) => {
      const formData = new FormData();
      formData.set("workspaceId", data.workspaceId);
      if (data.vaultId) formData.set("vaultId", data.vaultId);
      formData.set("title", data.title);
      formData.set("file", data.file);
      if (data.sourceType) formData.set("sourceType", data.sourceType);
      if (data.scope) formData.set("scope", data.scope);
      if (data.project) formData.set("project", data.project);
      if (data.content) formData.set("content", data.content);
      return api.postForm("/api/context-vault/documents/upload", formData);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["context-vault-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["context-vault-search"] });
    },
  });
}

export function useCreateContextVaultVault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspaceId: string; name: string }) =>
      api.post<{ vault: Vault }>("/api/context-vault/vaults", data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["context-vault-vaults", variables.workspaceId],
      });
    },
  });
}

export function useCancelContextVaultDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspaceId: string; vaultId?: string; documentId: string }) => {
      const searchParams = new URLSearchParams({ workspaceId: data.workspaceId });
      if (data.vaultId) searchParams.set("vaultId", data.vaultId);
      return api.post<CancelContextVaultDocumentResponse>(
        `/api/context-vault/documents/${data.documentId}/cancel?${searchParams.toString()}`,
        {},
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["context-vault-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["context-vault-search"] });
    },
  });
}

export function useDeleteContextVaultDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { workspaceId: string; vaultId?: string; documentId: string }) => {
      const searchParams = new URLSearchParams({ workspaceId: data.workspaceId });
      if (data.vaultId) searchParams.set("vaultId", data.vaultId);
      return api.delete(
        `/api/context-vault/documents/${data.documentId}?${searchParams.toString()}`,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["context-vault-documents", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["context-vault-search"] });
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

export function useUpdateWorkspaceBillingOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { workspaceId: string; userId: string }) =>
      api.patch<{
        workspace: { id: string; billingOwnerUserId: string };
      }>(`/api/workspaces/${data.workspaceId}/billing-owner`, {
        userId: data.userId,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-team", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
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
