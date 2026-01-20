export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type PlanType = "free" | "hobby" | "pro";

export type SubscriptionStatus = "active" | "on_hold" | "cancelled" | "expired";

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  memoryCount: number;
  memoryLimit: number;
  // Dodo Payments fields (only populated for paid users)
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
  status: SubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanType;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  name: string;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface CreateApiKeyRequest {
  name: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  key: string;
  createdAt: Date;
}

export interface ListApiKeysResponse {
  keys: ApiKey[];
}
