import type { PlanType } from "./user.js";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  role: string;
  createdAt: Date;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

export interface AdminUserDetails extends AdminUser {
  apiKeyCount: number;
}

export interface AdminStats {
  totalUsers: number;
  totalMemories: number;
  usersByPlan: Record<string, number>;
}

export interface ListUsersResponse {
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export interface UpdatePlanRequest {
  plan: PlanType;
}

export interface UpdatePlanResponse {
  success: boolean;
  previousPlan: string;
  newPlan: string;
  newLimit: number;
}

export interface UserUsageStats {
  searchesLast24h: number;
  searchesThisMonth: number;
  searchesAllTime: number;
  lastActivityAt: string | null;
}
