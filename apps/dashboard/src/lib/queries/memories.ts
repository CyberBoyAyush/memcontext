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
}

export type { MemoryGraphNode, MemoryGraphLink, MemoryGraphResponse };

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

      const query = searchParams.toString();
      return api.get<ListMemoriesResponse>(
        `/api/memories${query ? `?${query}` : ""}`,
      );
    },
  });

export const memoryGraphQueryOptions = () =>
  queryOptions({
    queryKey: ["memory-graph"] as const,
    queryFn: async () => {
      return api.get<MemoryGraphResponse>("/api/memories/graph");
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
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateMemoryParams) => {
      return api.patch<{ success: boolean }>(`/api/memories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{ success: boolean }>(`/api/memories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}

export const memoryHistoryQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["memory-history", id] as const,
    queryFn: async () => {
      return api.get<MemoryHistoryResponse>(`/api/memories/${id}/history`);
    },
    enabled: !!id,
  });

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async ({
      id,
      type,
      context,
    }: {
      id: string;
      type: "helpful" | "not_helpful" | "outdated" | "wrong";
      context?: string;
    }) => {
      return api.post<{ success: boolean }>(`/api/memories/${id}/feedback`, {
        type,
        context,
      });
    },
  });
}

export function useForgetMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.post<{ success: boolean; message: string }>(
        `/api/memories/${id}/forget`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memories"] });
    },
  });
}
