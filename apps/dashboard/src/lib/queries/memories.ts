import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";

interface Memory {
  id: string;
  content: string;
  category: string | null;
  project: string | null;
  source: string;
  createdAt: string;
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
  project?: string;
}

export const memoriesQueryOptions = (params?: ListMemoriesParams) =>
  queryOptions({
    queryKey: ["memories", params] as const,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      if (params?.category) searchParams.set("category", params.category);
      if (params?.project) searchParams.set("project", params.project);

      const query = searchParams.toString();
      return api.get<ListMemoriesResponse>(
        `/api/memories${query ? `?${query}` : ""}`,
      );
    },
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
