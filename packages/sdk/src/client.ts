import type {
  ApiError,
  HealthResponse,
  ListMemoriesRequest,
  ListMemoriesResponse,
  MemoryFeedbackRequest,
  MemoryFeedbackResponse,
  MemoryGraphResponse,
  MemoryHistoryResponse,
  MemoryProfile,
  SaveMemoryRequest,
  SaveMemoryResponse,
  SearchMemoryRequest,
  SearchMemoryResponse,
  SuccessResponse,
  UpdateMemoryRequest,
  UpdateMemoryResponse,
  Memory,
  ListMemoryItem,
  MemoryWithRelevance,
} from "@memcontext/types";
import { MemContextApiError } from "./errors.js";

export interface MemContextClientOptions {
  apiKey: string;
  baseUrl?: string;
  scope?: string;
  project?: string;
  fetch?: typeof fetch;
}

export interface ScopedRequestOptions {
  scope?: string;
  signal?: AbortSignal;
}

export interface ProfileRequestOptions extends ScopedRequestOptions {
  project?: string;
}

export interface SaveOptions {
  signal?: AbortSignal;
}

const DEFAULT_BASE_URL = "https://api.memcontext.in";

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function normalizeScope(scope: string | undefined): string | undefined {
  if (scope === undefined) return undefined;
  const normalized = scope.trim();
  if (normalized.length === 0) {
    throw new Error("Scope cannot be blank");
  }
  return normalized;
}

function normalizeProject(project: string | undefined): string | undefined {
  if (project === undefined) return undefined;
  const normalized = project
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (normalized.length === 0) {
    throw new Error("Project cannot be blank");
  }
  return normalized;
}

type JsonMemory = Omit<
  Memory,
  "deletedAt" | "validFrom" | "validUntil" | "createdAt"
> & {
  deletedAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
};

type JsonListMemoryItem = Omit<
  ListMemoryItem,
  "validFrom" | "validUntil" | "createdAt"
> & {
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
};

type JsonMemoryWithRelevance = Omit<MemoryWithRelevance, "createdAt"> & {
  createdAt: string;
};

function dateOrUndefined(value: string | null | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

function hydrateMemory(memory: JsonMemory): Memory {
  return {
    ...memory,
    deletedAt: dateOrUndefined(memory.deletedAt),
    validFrom: dateOrUndefined(memory.validFrom),
    validUntil: dateOrUndefined(memory.validUntil),
    createdAt: new Date(memory.createdAt),
  };
}

function hydrateListMemory(memory: JsonListMemoryItem): ListMemoryItem {
  return {
    ...memory,
    validFrom: dateOrUndefined(memory.validFrom),
    validUntil: dateOrUndefined(memory.validUntil),
    createdAt: new Date(memory.createdAt),
  };
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : "";
}

async function parseApiError(response: Response): Promise<ApiError> {
  try {
    return (await response.json()) as ApiError;
  } catch {
    return {
      error: `Request failed with status ${response.status}`,
    };
  }
}

export class MemContextClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultScope?: string;
  private readonly defaultProject?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: MemContextClientOptions) {
    if (!options.apiKey) {
      throw new Error("MemContextClient requires an apiKey");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.defaultScope = normalizeScope(options.scope);
    this.defaultProject = normalizeProject(options.project);
    this.fetchImpl = options.fetch ?? fetch;
  }

  withScope(scope?: string): MemContextClient {
    return new MemContextClient({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      project: this.defaultProject,
      scope,
      fetch: this.fetchImpl,
    });
  }

  withProject(project?: string): MemContextClient {
    return new MemContextClient({
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      project,
      scope: this.defaultScope,
      fetch: this.fetchImpl,
    });
  }

  async save(
    request: SaveMemoryRequest,
    options?: SaveOptions,
  ): Promise<SaveMemoryResponse> {
    return this.request<SaveMemoryResponse>("/api/memories", {
      method: "POST",
      body: {
        ...request,
        scope: normalizeScope(request.scope) ?? this.defaultScope,
        project: normalizeProject(request.project) ?? this.defaultProject,
        source: request.source ?? "api",
      },
      signal: options?.signal,
    });
  }

  async search(request: SearchMemoryRequest): Promise<SearchMemoryResponse> {
    const response = await this.request<
      Omit<SearchMemoryResponse, "memories"> & {
        memories: JsonMemoryWithRelevance[];
      }
    >(
      `/api/memories/search${buildQuery({
        query: request.query,
        limit: request.limit,
        category: request.category,
        scope: normalizeScope(request.scope) ?? this.defaultScope,
        project: normalizeProject(request.project) ?? this.defaultProject,
        threshold: request.threshold,
      })}`,
      { method: "GET" },
    );

    return {
      ...response,
      memories: response.memories.map((memory) => ({
        ...memory,
        createdAt: new Date(memory.createdAt),
      })),
    };
  }

  async list(request: ListMemoriesRequest = {}): Promise<ListMemoriesResponse> {
    const response = await this.request<
      Omit<ListMemoriesResponse, "memories"> & {
        memories: JsonListMemoryItem[];
      }
    >(
      `/api/memories${buildQuery({
        limit: request.limit,
        offset: request.offset,
        category: request.category,
        scope: normalizeScope(request.scope) ?? this.defaultScope,
        project: normalizeProject(request.project) ?? this.defaultProject,
        search: request.search,
      })}`,
      { method: "GET" },
    );

    return {
      ...response,
      memories: response.memories.map(hydrateListMemory),
    };
  }

  async get(memoryId: string, options?: ScopedRequestOptions): Promise<Memory> {
    const response = await this.request<JsonMemory>(
      `/api/memories/${memoryId}${this.scopeQuery(options)}`,
      { method: "GET", signal: options?.signal },
    );
    return hydrateMemory(response);
  }

  async update(
    memoryId: string,
    request: UpdateMemoryRequest,
    options?: ScopedRequestOptions,
  ): Promise<UpdateMemoryResponse> {
    return this.request<UpdateMemoryResponse>(
      `/api/memories/${memoryId}${this.scopeQuery(options)}`,
      {
        method: "PATCH",
        body: {
          ...request,
          project: normalizeProject(request.project) ?? this.defaultProject,
        },
        signal: options?.signal,
      },
    );
  }

  // Preferred soft-delete method for removing a memory from future retrieval.
  async delete(
    memoryId: string,
    options?: ScopedRequestOptions,
  ): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      `/api/memories/${memoryId}${this.scopeQuery(options)}`,
      { method: "DELETE", signal: options?.signal },
    );
  }

  // Endpoint-parity alias for soft delete. Prefer `delete()` unless you specifically
  // want the `/forget` response shape.
  async forget(
    memoryId: string,
    options?: ScopedRequestOptions,
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/memories/${memoryId}/forget${this.scopeQuery(options)}`,
      { method: "POST", signal: options?.signal },
    );
  }

  async feedback(
    memoryId: string,
    request: MemoryFeedbackRequest,
    options?: ScopedRequestOptions,
  ): Promise<MemoryFeedbackResponse> {
    return this.request<MemoryFeedbackResponse>(
      `/api/memories/${memoryId}/feedback${this.scopeQuery(options)}`,
      {
        method: "POST",
        body: request,
        signal: options?.signal,
      },
    );
  }

  async history(
    memoryId: string,
    options?: ScopedRequestOptions,
  ): Promise<MemoryHistoryResponse> {
    const response = await this.request<{
      current: JsonMemory;
      history: JsonMemory[];
    }>(
      `/api/memories/${memoryId}/history${this.scopeQuery(options)}`,
      { method: "GET", signal: options?.signal },
    );

    return {
      current: hydrateMemory(response.current),
      history: response.history.map(hydrateMemory),
    };
  }

  async profile(options: ProfileRequestOptions = {}): Promise<MemoryProfile> {
    return this.request<MemoryProfile>(
      `/api/memories/profile${buildQuery({
        scope: normalizeScope(options.scope) ?? this.defaultScope,
        project: normalizeProject(options.project) ?? this.defaultProject,
      })}`,
      { method: "GET", signal: options.signal },
    );
  }

  async graph(
    options: ScopedRequestOptions = {},
  ): Promise<MemoryGraphResponse> {
    return this.request<MemoryGraphResponse>(
      `/api/memories/graph${buildQuery({
        scope: normalizeScope(options.scope) ?? this.defaultScope,
      })}`,
      { method: "GET", signal: options.signal },
    );
  }

  async health(signal?: AbortSignal): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health", { method: "GET", signal });
  }

  private scopeQuery(options?: ScopedRequestOptions): string {
    return buildQuery({
      scope: normalizeScope(options?.scope) ?? this.defaultScope,
    });
  }

  private async request<T>(
    path: string,
    init: {
      method: string;
      body?: unknown;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: init.method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });

    if (!response.ok) {
      throw new MemContextApiError(
        response.status,
        await parseApiError(response),
      );
    }

    return response.json() as Promise<T>;
  }
}
