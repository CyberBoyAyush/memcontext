import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  MemoryGraphLink,
  MemoryGraphNode,
  MemoryGraphResponse,
} from "@memcontext/types";
import { api } from "../api";

interface Memory {
  id: string;
  content: string;
  category: string | null;
  project: string | null;
  source: string;
  validFrom?: string | null;
  validUntil?: string | null;
  version?: number;
  createdAt: string;
}

interface MemoryHistoryResponse {
  current: Memory;
  history: Memory[];
}

interface ListMemoriesResponse {
  memories: Memory[];
  total: number;
  hasMore: boolean;
}

interface ListMemoriesParams {
  workspaceId?: string;
  limit?: number;
  offset?: number;
  category?: string;
  categories?: string[];
  project?: string;
  projects?: string[];
  search?: string;
  scope?: string;
  sort?: "asc" | "desc";
}

export interface MemoryHierarchyProject {
  name: string;
  value: string;
  count: number;
}

export interface MemoryHierarchyScope {
  name: string;
  count: number;
  projects: MemoryHierarchyProject[];
}

export interface MemoryHierarchyResponse {
  global: { count: number; projects: MemoryHierarchyProject[] };
  scopes: MemoryHierarchyScope[];
}

export type { MemoryGraphNode, MemoryGraphLink, MemoryGraphResponse };

export const memoryHierarchyQueryOptions = (workspaceId?: string) =>
  queryOptions({
    queryKey: ["memory-hierarchy", workspaceId ?? null] as const,
    queryFn: async () => {
      const query = workspaceId
        ? `?workspaceId=${encodeURIComponent(workspaceId)}`
        : "";
      return api.get<MemoryHierarchyResponse>(
        `/api/user/memory-hierarchy${query}`,
      );
    },
    staleTime: 60_000,
  });

export const memoriesQueryOptions = (params?: ListMemoriesParams) =>
  queryOptions({
    queryKey: ["memories", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.workspaceId) {
        searchParams.set("workspaceId", params.workspaceId);
      }
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));

      if (params?.categories && params.categories.length > 0) {
        searchParams.set("category", params.categories.join(","));
      } else if (params?.category) {
        searchParams.set("category", params.category);
      }

      if (params?.projects && params.projects.length > 0) {
        searchParams.set("project", params.projects.join(","));
      } else if (params?.project) {
        searchParams.set("project", params.project);
      }

      if (params?.search) searchParams.set("search", params.search);
      if (params?.scope) searchParams.set("scope", params.scope);
      if (params?.sort) searchParams.set("sort", params.sort);

      const query = searchParams.toString();
      return api.get<ListMemoriesResponse>(
        `/api/memories${query ? `?${query}` : ""}`,
      );
    },
  });

export const memoryGraphQueryOptions = (scope?: string, workspaceId?: string) =>
  queryOptions({
    queryKey: ["memory-graph", scope ?? null, workspaceId ?? null] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (scope) searchParams.set("scope", scope);
      if (workspaceId) searchParams.set("workspaceId", workspaceId);
      const query = searchParams.toString();
      return api.get<MemoryGraphResponse>(
        `/api/memories/graph${query ? `?${query}` : ""}`,
      );
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

interface UpdateMemoryParams {
  id: string;
  workspaceId?: string;
  content?: string;
  category?: string;
  project?: string;
  scope?: string;
}

function appendMemoryContext(path: string, scope?: string, workspaceId?: string) {
  const searchParams = new URLSearchParams();
  if (scope !== undefined) searchParams.set("scope", scope);
  if (workspaceId) searchParams.set("workspaceId", workspaceId);
  const query = searchParams.toString();
  if (!query) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${query}`;
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scope, workspaceId, ...data }: UpdateMemoryParams) => {
      return api.patch<{ success: boolean }>(
        appendMemoryContext(`/api/memories/${id}`, scope, workspaceId),
        data,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["memory-graph"] });
      queryClient.invalidateQueries({
        queryKey: ["memory-history", variables.id],
      });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      scope,
      workspaceId,
    }: {
      id: string;
      scope?: string;
      workspaceId?: string;
    }) => {
      return api.delete<{ success: boolean }>(
        appendMemoryContext(`/api/memories/${id}`, scope, workspaceId),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["memory-graph"] });
    },
  });
}

export function useDeleteMemories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      scope,
      workspaceId,
    }: {
      ids: string[];
      scope?: string;
      workspaceId?: string;
    }) => {
      return api.delete<{ success: boolean; deletedCount: number }>(
        "/api/memories/bulk",
        { ids, scope, workspaceId },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["memory-graph"] });
    },
  });
}

export const memoryHistoryQueryOptions = (
  id: string,
  scope?: string,
  workspaceId?: string,
) =>
  queryOptions({
    queryKey: ["memory-history", id, scope ?? null, workspaceId ?? null] as const,
    queryFn: async () => {
      return api.get<MemoryHistoryResponse>(
        appendMemoryContext(`/api/memories/${id}/history`, scope, workspaceId),
      );
    },
    enabled: !!id,
  });

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async ({
      id,
      type,
      context,
      scope,
      workspaceId,
    }: {
      id: string;
      type: "helpful" | "not_helpful" | "outdated" | "wrong";
      context?: string;
      scope?: string;
      workspaceId?: string;
    }) => {
      return api.post<{ success: boolean }>(
        appendMemoryContext(`/api/memories/${id}/feedback`, scope, workspaceId),
        {
          type,
          context,
        },
      );
    },
  });
}

export function useForgetMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      scope,
      workspaceId,
    }: {
      id: string;
      scope?: string;
      workspaceId?: string;
    }) => {
      return api.post<{ success: boolean; message: string }>(
        appendMemoryContext(`/api/memories/${id}/forget`, scope, workspaceId),
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["memory-graph"] });
    },
  });
}
