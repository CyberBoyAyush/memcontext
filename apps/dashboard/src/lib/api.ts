const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchWithCredentials<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(
      res.status,
      error.error || error.message || "Request failed",
    );
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => fetchWithCredentials<T>(path),

  post: <T>(path: string, data: unknown) =>
    fetchWithCredentials<T>(path, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  patch: <T>(path: string, data: unknown) =>
    fetchWithCredentials<T>(path, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: <T>(path: string) =>
    fetchWithCredentials<T>(path, { method: "DELETE" }),
};
