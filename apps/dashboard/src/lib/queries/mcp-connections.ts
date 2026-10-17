import {
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../api";

interface McpConnection {
  id: string;
  clientId: string;
  clientName: string | null;
  clientUri: string | null;
  logoUri: string | null;
  redirectUri: string | null;
  scopes: string[];
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  isCurrentUser: boolean;
  connectedAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

interface ListMcpConnectionsResponse {
  canManageAll: boolean;
  connections: McpConnection[];
}

export const mcpConnectionsQueryOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ["mcp-connections", workspaceId] as const,
    queryFn: () =>
      api.get<ListMcpConnectionsResponse>(
        `/api/mcp-connections?workspaceId=${encodeURIComponent(workspaceId)}`,
      ),
    enabled: Boolean(workspaceId),
  });

export function useDisconnectMcpConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, workspaceId }: { id: string; workspaceId: string }) =>
      api.delete<{ success: boolean }>(
        `/api/mcp-connections/${encodeURIComponent(id)}?workspaceId=${encodeURIComponent(workspaceId)}`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-connections"] });
    },
  });
}

export type { McpConnection, ListMcpConnectionsResponse };
