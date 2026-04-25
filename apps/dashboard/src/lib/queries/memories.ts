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
  limit?: number;
  offset?: number;
  category?: string;
  categories?: string[];
  project?: string;
  projects?: string[];
  search?: string;
  scope?: string;
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

export const memoryHierarchyQueryOptions = () =>
  queryOptions({
    queryKey: ["memory-hierarchy"] as const,
    queryFn: async () =>
      api.get<MemoryHierarchyResponse>("/api/user/memory-hierarchy"),
    staleTime: 60_000,
  });

export const memoriesQueryOptions = (params?: ListMemoriesParams) =>
  queryOptions({
    queryKey: ["memories", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
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

      const query = searchParams.toString();
      return api.get<ListMemoriesResponse>(
        `/api/memories${query ? `?${query}` : ""}`,
      );
    },
  });

export const memoryGraphQueryOptions = (scope?: string) =>
  queryOptions({
    queryKey: ["memory-graph", scope ?? null] as const,
    queryFn: async () => {
      const query = scope ? `?scope=${encodeURIComponent(scope)}` : "";
      return api.get<MemoryGraphResponse>(`/api/memories/graph${query}`);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

interface UpdateMemoryParams {
  id: string;
  content?: string;
  category?: string;
  project?: string;
  scope?: string;
}

function appendScope(path: string, scope?: string) {
  if (scope === undefined) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}scope=${encodeURIComponent(scope)}`;
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scope, ...data }: UpdateMemoryParams) => {
      return api.patch<{ success: boolean }>(
        appendScope(`/api/memories/${id}`, scope),
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
    mutationFn: async ({ id, scope }: { id: string; scope?: string }) => {
      return api.delete<{ success: boolean }>(
        appendScope(`/api/memories/${id}`, scope),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
      queryClient.invalidateQueries({ queryKey: ["memory-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["memory-graph"] });
    },
  });
}

export const memoryHistoryQueryOptions = (id: string, scope?: string) =>
  queryOptions({
    queryKey: ["memory-history", id, scope ?? null] as const,
    queryFn: async () => {
      return api.get<MemoryHistoryResponse>(
        appendScope(`/api/memories/${id}/history`, scope),
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
    }: {
      id: string;
      type: "helpful" | "not_helpful" | "outdated" | "wrong";
      context?: string;
      scope?: string;
    }) => {
      return api.post<{ success: boolean }>(
        appendScope(`/api/memories/${id}/feedback`, scope),
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
    mutationFn: async ({ id, scope }: { id: string; scope?: string }) => {
      return api.post<{ success: boolean; message: string }>(
        appendScope(`/api/memories/${id}/forget`, scope),
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
