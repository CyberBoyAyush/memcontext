import type {
  ApiError,
  AcceptWorkspaceInvitationRequest,
  AcceptWorkspaceInvitationResponse,
  CancelContextVaultDocumentResponse,
  ContextVaultDocument,
  ContextVaultHierarchyResponse,
  ContextVaultMemory,
  ContextVaultMemoryFeedbackRequest,
  CorrectContextVaultMemoryRequest,
  CorrectContextVaultMemoryResponse,
  ContextVaultSearchChunk,
  ContextVaultSearchMemory,
  CreateContextVaultMemoryRequest,
  CreateContextVaultMemoryResponse,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  DeleteContextVaultDocumentResponse,
  DeleteContextVaultMemoryResponse,
  HealthResponse,
  IngestContextVaultDocumentRequest,
  IngestContextVaultDocumentResponse,
  InviteWorkspaceMemberRequest,
  InviteWorkspaceMemberResponse,
  ListContextVaultDocumentMemoriesResponse,
  ListContextVaultDocumentsResponse,
  ListContextVaultMemoriesRequest,
  ListContextVaultMemoriesResponse,
  ListContextVaultMemoryEvidenceResponse,
  ListMemoriesRequest,
  ListMemoriesResponse,
  ListWorkspaceTeamResponse,
  ListWorkspacesResponse,
  MemoryFeedbackRequest,
  MemoryFeedbackResponse,
  MemoryGraphResponse,
  MemoryHistoryResponse,
  MemoryProfile,
  SaveMemoryRequest,
  SaveMemoryResponse,
  SearchMemoryRequest,
  SearchMemoryResponse,
  SearchContextVaultRequest,
  SearchContextVaultResponse,
  SuccessResponse,
  UpdateMemoryRequest,
  UpdateMemoryResponse,
  UpdateWorkspaceMemberRequest,
  UpdateWorkspaceMemberResponse,
  UploadContextVaultDocumentRequest,
  Memory,
  ListMemoryItem,
  MemoryWithRelevance,
} from "./types.js";
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
  | "category"
  | "scope"
  | "project"
  | "supersedesId"
  | "rootId"
  | "deletedAt"
  | "validFrom"
  | "validUntil"
  | "createdAt"
> & {
  category?: Memory["category"] | null;
  scope?: string | null;
  project?: string | null;
  supersedesId?: string | null;
  rootId?: string | null;
  deletedAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
};

type JsonListMemoryItem = Omit<
  ListMemoryItem,
  "category" | "scope" | "project" | "validFrom" | "validUntil" | "createdAt"
> & {
  category?: ListMemoryItem["category"] | null;
  scope?: string | null;
  project?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  createdAt: string;
};

type JsonMemoryWithRelevance = Omit<
  MemoryWithRelevance,
  "category" | "scope" | "project" | "createdAt"
> & {
  category?: MemoryWithRelevance["category"] | null;
  scope?: string | null;
  project?: string | null;
  createdAt: string;
};

type JsonWorkspaceResponse = Omit<CreateWorkspaceResponse, "workspace"> & {
  workspace: Omit<CreateWorkspaceResponse["workspace"], "createdAt"> & {
    createdAt: string;
  };
};

type JsonListWorkspacesResponse = Omit<ListWorkspacesResponse, "workspaces"> & {
  workspaces: Array<
    Omit<ListWorkspacesResponse["workspaces"][number], "createdAt"> & {
      createdAt: string;
    }
  >;
};

type JsonInviteWorkspaceMemberResponse = Omit<
  InviteWorkspaceMemberResponse,
  "invitation"
> & {
  invitation: Omit<
    InviteWorkspaceMemberResponse["invitation"],
    "expiresAt" | "createdAt"
  > & {
    expiresAt: string;
    createdAt: string;
  };
};

type JsonListWorkspaceTeamResponse = Omit<
  ListWorkspaceTeamResponse,
  "members" | "invitations"
> & {
  members: Array<
    Omit<ListWorkspaceTeamResponse["members"][number], "createdAt"> & {
      createdAt: string;
    }
  >;
  invitations: Array<
    Omit<
      ListWorkspaceTeamResponse["invitations"][number],
      "expiresAt" | "createdAt"
    > & {
      expiresAt: string;
      createdAt: string;
    }
  >;
};

type JsonContextVaultDocument = Omit<
  ContextVaultDocument,
  "createdAt" | "completedAt" | "heartbeatAt"
> & {
  createdAt: string;
  completedAt: string | null;
  heartbeatAt: string | null;
};

type JsonContextVaultMemory = Omit<ContextVaultMemory, "createdAt"> & {
  createdAt: string;
};

type JsonContextVaultSearchChunk = Omit<
  ContextVaultSearchChunk,
  "createdAt"
> & {
  createdAt: string;
};

type JsonContextVaultSearchMemory = Omit<
  ContextVaultSearchMemory,
  "createdAt"
> & {
  createdAt: string;
};

function dateOrUndefined(value: string | null | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

function hydrateMemory(memory: JsonMemory): Memory {
  return {
    ...memory,
    category: memory.category ?? undefined,
    scope: memory.scope ?? undefined,
    project: memory.project ?? undefined,
    supersedesId: memory.supersedesId ?? undefined,
    rootId: memory.rootId ?? undefined,
    deletedAt: dateOrUndefined(memory.deletedAt),
    validFrom: dateOrUndefined(memory.validFrom),
    validUntil: dateOrUndefined(memory.validUntil),
    createdAt: new Date(memory.createdAt),
  };
}

function hydrateListMemory(memory: JsonListMemoryItem): ListMemoryItem {
  return {
    ...memory,
    category: memory.category ?? undefined,
    scope: memory.scope ?? undefined,
    project: memory.project ?? undefined,
    validFrom: dateOrUndefined(memory.validFrom),
    validUntil: dateOrUndefined(memory.validUntil),
    createdAt: new Date(memory.createdAt),
  };
}

function hydrateContextVaultDocument(
  document: JsonContextVaultDocument,
): ContextVaultDocument {
  return {
    ...document,
    createdAt: new Date(document.createdAt),
    completedAt: document.completedAt ? new Date(document.completedAt) : null,
    heartbeatAt: document.heartbeatAt ? new Date(document.heartbeatAt) : null,
  };
}

function hydrateContextVaultMemory(
  memory: JsonContextVaultMemory,
): ContextVaultMemory {
  return {
    ...memory,
    createdAt: new Date(memory.createdAt),
  };
}

function hydrateContextVaultSearchMemory(
  memory: JsonContextVaultSearchMemory,
): ContextVaultSearchMemory {
  return {
    ...memory,
    createdAt: new Date(memory.createdAt),
  };
}

function hydrateContextVaultSearchChunk(
  chunk: JsonContextVaultSearchChunk,
): ContextVaultSearchChunk {
  return {
    ...chunk,
    createdAt: new Date(chunk.createdAt),
  };
}

function buildQuery(
  params: Record<string, string | number | boolean | string[] | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      if (value.length > 0) searchParams.set(key, value.join(","));
    } else if (value !== undefined) {
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
        category: memory.category ?? undefined,
        scope: memory.scope ?? undefined,
        project: memory.project ?? undefined,
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
    }>(`/api/memories/${memoryId}/history${this.scopeQuery(options)}`, {
      method: "GET",
      signal: options?.signal,
    });

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

  async listWorkspaces(): Promise<ListWorkspacesResponse> {
    const response = await this.request<JsonListWorkspacesResponse>(
      "/api/workspaces",
      {
        method: "GET",
      },
    );

    return {
      workspaces: response.workspaces.map((workspace) => ({
        ...workspace,
        createdAt: new Date(workspace.createdAt),
      })),
    };
  }

  async createWorkspace(
    request: CreateWorkspaceRequest,
  ): Promise<CreateWorkspaceResponse> {
    const response = await this.request<JsonWorkspaceResponse>(
      "/api/workspaces",
      {
        method: "POST",
        body: request,
      },
    );

    return {
      workspace: {
        ...response.workspace,
        createdAt: new Date(response.workspace.createdAt),
      },
    };
  }

  async inviteWorkspaceMember(
    workspaceId: string,
    request: InviteWorkspaceMemberRequest,
  ): Promise<InviteWorkspaceMemberResponse> {
    const response = await this.request<JsonInviteWorkspaceMemberResponse>(
      `/api/workspaces/${workspaceId}/invitations`,
      {
        method: "POST",
        body: request,
      },
    );

    return {
      ...response,
      invitation: {
        ...response.invitation,
        expiresAt: new Date(response.invitation.expiresAt),
        createdAt: new Date(response.invitation.createdAt),
      },
    };
  }

  async listWorkspaceTeam(
    workspaceId: string,
  ): Promise<ListWorkspaceTeamResponse> {
    const response = await this.request<JsonListWorkspaceTeamResponse>(
      `/api/workspaces/${workspaceId}/team`,
      { method: "GET" },
    );

    return {
      ...response,
      members: response.members.map((member) => ({
        ...member,
        createdAt: new Date(member.createdAt),
      })),
      invitations: response.invitations.map((invitation) => ({
        ...invitation,
        expiresAt: new Date(invitation.expiresAt),
        createdAt: new Date(invitation.createdAt),
      })),
    };
  }

  async updateWorkspaceMember(
    workspaceId: string,
    memberId: string,
    request: UpdateWorkspaceMemberRequest,
  ): Promise<UpdateWorkspaceMemberResponse> {
    const response = await this.request<
      Omit<UpdateWorkspaceMemberResponse, "member"> & {
        member: Omit<
          UpdateWorkspaceMemberResponse["member"],
          "createdAt"
        > & {
          createdAt: string;
        };
      }
    >(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      body: request,
    });

    return {
      member: {
        ...response.member,
        createdAt: new Date(response.member.createdAt),
      },
    };
  }

  async removeWorkspaceMember(
    workspaceId: string,
    memberId: string,
  ): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      `/api/workspaces/${workspaceId}/members/${memberId}`,
      { method: "DELETE" },
    );
  }

  async revokeWorkspaceInvitation(
    workspaceId: string,
    invitationId: string,
  ): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      `/api/workspaces/${workspaceId}/invitations/${invitationId}`,
      { method: "DELETE" },
    );
  }

  async acceptWorkspaceInvitation(
    request: AcceptWorkspaceInvitationRequest,
  ): Promise<AcceptWorkspaceInvitationResponse> {
    return this.request<AcceptWorkspaceInvitationResponse>(
      "/api/workspaces/invitations/accept",
      {
        method: "POST",
        body: request,
      },
    );
  }

  async listContextVaultDocuments(
    workspaceId: string,
    vaultIdOrOptions?: string | SaveOptions,
    options?: SaveOptions,
  ): Promise<ListContextVaultDocumentsResponse> {
    const vaultId =
      typeof vaultIdOrOptions === "string" ? vaultIdOrOptions : undefined;
    const requestOptions =
      typeof vaultIdOrOptions === "string" ? options : vaultIdOrOptions;
    const response = await this.request<{
      documents: JsonContextVaultDocument[];
    }>(`/api/context-vault/documents${buildQuery({ workspaceId, vaultId })}`, {
      method: "GET",
      signal: requestOptions?.signal,
    });

    return {
      documents: response.documents.map(hydrateContextVaultDocument),
    };
  }

  async ingestContextVaultDocument(
    request: IngestContextVaultDocumentRequest,
    options?: SaveOptions,
  ): Promise<IngestContextVaultDocumentResponse> {
    const response = await this.request<
      Omit<IngestContextVaultDocumentResponse, "document"> & {
        document: JsonContextVaultDocument;
      }
    >("/api/context-vault/documents", {
      method: "POST",
      body: {
        ...request,
        scope: normalizeScope(request.scope) ?? this.defaultScope,
        project: normalizeProject(request.project) ?? this.defaultProject,
      },
      signal: options?.signal,
    });

    return {
      ...response,
      document: hydrateContextVaultDocument(response.document),
    };
  }

  async uploadContextVaultDocument(
    request: UploadContextVaultDocumentRequest,
    options?: SaveOptions,
  ): Promise<IngestContextVaultDocumentResponse> {
    const form = new FormData();
    form.set("workspaceId", request.workspaceId);
    if (request.vaultId) form.set("vaultId", request.vaultId);
    form.set("title", request.title);
    if (request.filename) {
      form.set("file", request.file, request.filename);
    } else {
      form.set("file", request.file);
    }
    if (request.sourceType) form.set("sourceType", request.sourceType);
    const scope = normalizeScope(request.scope) ?? this.defaultScope;
    if (scope) form.set("scope", scope);
    const project = normalizeProject(request.project) ?? this.defaultProject;
    if (project) form.set("project", project);
    if (request.content) form.set("content", request.content);

    const response = await this.requestForm<
      Omit<IngestContextVaultDocumentResponse, "document"> & {
        document: JsonContextVaultDocument;
      }
    >("/api/context-vault/documents/upload", form, options?.signal);

    return {
      ...response,
      document: hydrateContextVaultDocument(response.document),
    };
  }

  async cancelContextVaultDocument(
    documentId: string,
    request: { workspaceId: string; vaultId?: string },
    options?: SaveOptions,
  ): Promise<CancelContextVaultDocumentResponse> {
    return this.request<CancelContextVaultDocumentResponse>(
      `/api/context-vault/documents/${documentId}/cancel${buildQuery({
        workspaceId: request.workspaceId,
        vaultId: request.vaultId,
      })}`,
      { method: "POST", signal: options?.signal },
    );
  }

  async deleteContextVaultDocument(
    documentId: string,
    request: { workspaceId: string; vaultId?: string },
    options?: SaveOptions,
  ): Promise<DeleteContextVaultDocumentResponse> {
    return this.request<DeleteContextVaultDocumentResponse>(
      `/api/context-vault/documents/${documentId}${buildQuery({
        workspaceId: request.workspaceId,
        vaultId: request.vaultId,
      })}`,
      { method: "DELETE", signal: options?.signal },
    );
  }

  async listContextVaultMemories(
    request: ListContextVaultMemoriesRequest,
    options?: SaveOptions,
  ): Promise<ListContextVaultMemoriesResponse> {
    const response = await this.request<
      Omit<ListContextVaultMemoriesResponse, "memories"> & {
        memories: JsonContextVaultMemory[];
      }
    >(
      `/api/context-vault/memories${buildQuery({
        workspaceId: request.workspaceId,
        vaultId: request.vaultId,
        scope: normalizeScope(request.scope) ?? this.defaultScope,
        project: normalizeProject(request.project) ?? this.defaultProject,
        projects: request.projects,
        search: request.search,
        limit: request.limit,
        offset: request.offset,
      })}`,
      { method: "GET", signal: options?.signal },
    );

    return {
      ...response,
      memories: response.memories.map(hydrateContextVaultMemory),
    };
  }

  async listContextVaultDocumentMemories(
    workspaceId: string,
    documentId: string,
    vaultIdOrOptions?: string | SaveOptions,
    options?: SaveOptions,
  ): Promise<ListContextVaultDocumentMemoriesResponse> {
    const vaultId =
      typeof vaultIdOrOptions === "string" ? vaultIdOrOptions : undefined;
    const requestOptions =
      typeof vaultIdOrOptions === "string" ? options : vaultIdOrOptions;
    const response = await this.request<
      Omit<ListContextVaultDocumentMemoriesResponse, "memories"> & {
        memories: JsonContextVaultMemory[];
      }
    >(
      `/api/context-vault/documents/${documentId}/memories${buildQuery({
        workspaceId,
        vaultId,
      })}`,
      { method: "GET", signal: requestOptions?.signal },
    );

    return {
      ...response,
      memories: response.memories.map(hydrateContextVaultMemory),
    };
  }

  async createContextVaultMemory(
    request: CreateContextVaultMemoryRequest,
    options?: SaveOptions,
  ): Promise<CreateContextVaultMemoryResponse> {
    const response = await this.request<{
      memory: JsonContextVaultMemory;
    }>("/api/context-vault/memories", {
      method: "POST",
      body: {
        ...request,
        scope: normalizeScope(request.scope) ?? this.defaultScope,
        project: normalizeProject(request.project) ?? this.defaultProject,
      },
      signal: options?.signal,
    });

    return {
      memory: hydrateContextVaultMemory(response.memory),
    };
  }

  async submitContextVaultMemoryFeedback(
    memoryId: string,
    request: ContextVaultMemoryFeedbackRequest,
    options?: SaveOptions,
  ): Promise<MemoryFeedbackResponse> {
    return this.request<MemoryFeedbackResponse>(
      `/api/context-vault/memories/${memoryId}/feedback`,
      {
        method: "POST",
        body: request,
        signal: options?.signal,
      },
    );
  }

  async deleteContextVaultMemory(
    workspaceId: string,
    memoryId: string,
    vaultIdOrOptions?: string | SaveOptions,
    options?: SaveOptions,
  ): Promise<DeleteContextVaultMemoryResponse> {
    const vaultId =
      typeof vaultIdOrOptions === "string" ? vaultIdOrOptions : undefined;
    const requestOptions =
      typeof vaultIdOrOptions === "string" ? options : vaultIdOrOptions;
    return this.request<DeleteContextVaultMemoryResponse>(
      `/api/context-vault/memories/${memoryId}${buildQuery({ workspaceId, vaultId })}`,
      { method: "DELETE", signal: requestOptions?.signal },
    );
  }

  async correctContextVaultMemory(
    memoryId: string,
    request: CorrectContextVaultMemoryRequest,
    options?: SaveOptions,
  ): Promise<CorrectContextVaultMemoryResponse> {
    const response = await this.request<
      Omit<CorrectContextVaultMemoryResponse, "memory"> & {
        memory: JsonContextVaultMemory;
      }
    >(`/api/context-vault/memories/${memoryId}/correction`, {
      method: "POST",
      body: request,
      signal: options?.signal,
    });

    return {
      ...response,
      memory: hydrateContextVaultMemory(response.memory),
    };
  }

  async listContextVaultMemoryEvidence(
    workspaceId: string,
    memoryId: string,
    vaultIdOrOptions?: string | SaveOptions,
    options?: SaveOptions,
  ): Promise<ListContextVaultMemoryEvidenceResponse> {
    const vaultId =
      typeof vaultIdOrOptions === "string" ? vaultIdOrOptions : undefined;
    const requestOptions =
      typeof vaultIdOrOptions === "string" ? options : vaultIdOrOptions;
    return this.request<ListContextVaultMemoryEvidenceResponse>(
      `/api/context-vault/memories/${memoryId}/evidence${buildQuery({
        workspaceId,
        vaultId,
      })}`,
      { method: "GET", signal: requestOptions?.signal },
    );
  }

  async getContextVaultHierarchy(
    workspaceId: string,
    vaultIdOrOptions?: string | SaveOptions,
    options?: SaveOptions,
  ): Promise<ContextVaultHierarchyResponse> {
    const vaultId =
      typeof vaultIdOrOptions === "string" ? vaultIdOrOptions : undefined;
    const requestOptions =
      typeof vaultIdOrOptions === "string" ? options : vaultIdOrOptions;
    return this.request<ContextVaultHierarchyResponse>(
      `/api/context-vault/hierarchy${buildQuery({ workspaceId, vaultId })}`,
      { method: "GET", signal: requestOptions?.signal },
    );
  }

  async searchContextVault(
    request: SearchContextVaultRequest,
    options?: SaveOptions,
  ): Promise<SearchContextVaultResponse> {
    const scopes = request.scopes
      ?.map(normalizeScope)
      .filter((scope): scope is string => !!scope);
    const response = await this.request<
      Omit<SearchContextVaultResponse, "chunks" | "memories"> & {
        chunks: JsonContextVaultSearchChunk[];
        memories: JsonContextVaultSearchMemory[];
      }
    >(
      `/api/context-vault/search${buildQuery({
        workspaceId: request.workspaceId,
        vaultId: request.vaultId,
        query: request.query,
        mode: request.mode,
        scope: normalizeScope(request.scope) ?? this.defaultScope,
        scopes,
        project: normalizeProject(request.project) ?? this.defaultProject,
        limit: request.limit,
      })}`,
      { method: "GET", signal: options?.signal },
    );

    return {
      ...response,
      chunks: response.chunks.map(hydrateContextVaultSearchChunk),
      memories: response.memories.map(hydrateContextVaultSearchMemory),
    };
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

  private async requestForm<T>(
    path: string,
    form: FormData,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
      },
      body: form,
      signal,
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
