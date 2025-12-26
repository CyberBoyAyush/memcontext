interface ApiClientConfig {
  apiBase: string;
  apiKey: string;
}

interface ApiError {
  error: string;
  code?: string;
  errorId?: string;
}

export interface ApiClient {
  post<T>(path: string, body: unknown): Promise<T>;
  get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
  ): Promise<T>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  const { apiBase, apiKey } = config;

  return {
    async post<T>(path: string, body: unknown): Promise<T> {
      const res = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = (await res.json()) as ApiError;
        const message = error.errorId
          ? `${error.error} (Reference: ${error.errorId})`
          : error.error || `Request failed: ${res.status}`;
        throw new Error(message);
      }

      return res.json() as Promise<T>;
    },

    async get<T>(
      path: string,
      params?: Record<string, string | number | undefined>,
    ): Promise<T> {
      const url = new URL(`${apiBase}${path}`);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
      }

      const res = await fetch(url, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!res.ok) {
        const error = (await res.json()) as ApiError;
        const message = error.errorId
          ? `${error.error} (Reference: ${error.errorId})`
          : error.error || `Request failed: ${res.status}`;
        throw new Error(message);
      }

      return res.json() as Promise<T>;
    },
  };
}
