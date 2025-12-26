export interface ApiError {
  error: string;
  code?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  database?: boolean;
}

export interface CachedApiKeyData {
  userId: string;
  keyId: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}
