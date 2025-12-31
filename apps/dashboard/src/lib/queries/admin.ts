import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  createdAt: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

interface AdminUserDetails extends AdminUser {
  apiKeyCount: number;
}

interface AdminStats {
  totalUsers: number;
  totalMemories: number;
  usersByPlan: Record<string, number>;
}

interface ListUsersResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

interface UpdatePlanResponse {
  success: boolean;
  previousPlan: string;
  newPlan: string;
  newLimit: number;
}

interface UserUsageStats {
  searchesLast24h: number;
  searchesThisMonth: number;
  searchesAllTime: number;
  lastActivityAt: string | null;
}

type PlanType = "free" | "hobby" | "pro";

interface ListUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
}

export const adminUsersQueryOptions = (params: ListUsersParams = {}) => {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.offset) searchParams.set("offset", params.offset.toString());
  if (params.search) searchParams.set("search", params.search);

  const queryString = searchParams.toString();
  const url = `/api/admin/users${queryString ? `?${queryString}` : ""}`;

  return queryOptions({
    queryKey: ["admin", "users", params] as const,
    queryFn: async () => {
      return api.get<ListUsersResponse>(url);
    },
  });
};

export const adminUserDetailsQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["admin", "user", userId] as const,
    queryFn: async () => {
      return api.get<AdminUserDetails>(`/api/admin/users/${userId}`);
    },
  });

export const adminStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["admin", "stats"] as const,
    queryFn: async () => {
      return api.get<AdminStats>("/api/admin/stats");
    },
  });

export const adminUserUsageQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["admin", "user", userId, "usage"] as const,
    queryFn: async () => {
      return api.get<UserUsageStats>(`/api/admin/users/${userId}/usage`);
    },
    staleTime: 0,
    retry: false,
  });

export function useUpdateUserPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      plan,
    }: {
      userId: string;
      plan: PlanType;
    }) => {
      return api.patch<UpdatePlanResponse>(`/api/admin/users/${userId}/plan`, {
        plan,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "user", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export type {
  AdminUser,
  AdminUserDetails,
  AdminStats,
  ListUsersResponse,
  PlanType,
  UserUsageStats,
};
