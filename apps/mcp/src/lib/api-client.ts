function getApiBase(): string {
  return process.env.MEMCONTEXT_API_URL || "http://localhost:3000";
}

function getApiKey(): string {
  const apiKey = process.env.MEMCONTEXT_API_KEY;
  if (!apiKey) {
    throw new Error("MEMCONTEXT_API_KEY environment variable is required");
  }
  return apiKey;
}

interface ApiError {
  error: string;
  code?: string;
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": getApiKey(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = (await res.json()) as ApiError;
    throw new Error(error.error || `API request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const url = new URL(`${getApiBase()}${path}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const res = await fetch(url, {
    headers: {
      "X-API-Key": getApiKey(),
    },
  });

  if (!res.ok) {
    const error = (await res.json()) as ApiError;
    throw new Error(error.error || `API request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}
