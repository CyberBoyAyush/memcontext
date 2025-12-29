import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";

interface ApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: string;
  createdAt: string;
}

interface ListApiKeysResponse {
  keys: ApiKey[];
}

interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  key: string;
  createdAt: string;
}

export const apiKeysQueryOptions = () =>
  queryOptions({
    queryKey: ["api-keys"] as const,
    queryFn: async () => {
      return api.get<ListApiKeysResponse>("/api/api-keys");
    },
  });

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      return api.post<CreateApiKeyResponse>("/api/api-keys", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.delete<{ success: boolean }>(`/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export type { ApiKey, CreateApiKeyResponse };
