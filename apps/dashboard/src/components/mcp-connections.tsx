"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Brain,
  Clock,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Unplug,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  describeRedirectTarget,
  getClientBrand,
  type ClientBrand,
} from "@/components/oauth/client-brand";
import {
  mcpConnectionsQueryOptions,
  useDisconnectMcpConnection,
  type McpConnection,
} from "@/lib/queries/mcp-connections";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import { useWorkspace } from "@/providers/workspace-provider";

const RECENT_MS = 24 * 60 * 60 * 1000;

const absolute = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const isRecent = (iso: string) =>
  Date.now() - new Date(iso).getTime() < RECENT_MS;

function memberLabel(connection: McpConnection) {
  return connection.userName || connection.userEmail || "Unknown member";
}

function LogoTile({
  brand,
  size = "md",
}: {
  brand: ClientBrand;
  size?: "md" | "lg";
}) {
  return (
    <div className="relative shrink-0" role="img" aria-label={brand.name}>
      <div
        className="pointer-events-none absolute -inset-1.5 rounded-xl opacity-60 blur-md transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle, ${brand.accent}33 0%, transparent 70%)`,
        }}
        aria-hidden
      />
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[#111]",
          size === "lg" ? "h-12 w-12" : "h-10 w-10",
        )}
        style={{ boxShadow: `inset 0 0 0 1px ${brand.accent}26` }}
      >
        <div
          className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-transparent"
          aria-hidden
        />
        {brand.logo}
      </div>
    </div>
  );
}

function Chip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background-secondary px-2 py-0.5 text-[10.5px] font-medium text-foreground-muted [&_svg]:h-2.5 [&_svg]:w-2.5">
      {icon}
      {children}
    </span>
  );
}

function ConnectionRow({
  connection,
  canManageAll,
  onDisconnect,
}: {
  connection: McpConnection;
  canManageAll: boolean;
  onDisconnect: (connection: McpConnection) => void;
}) {
  const brand = getClientBrand(connection);
  const target = describeRedirectTarget(connection.redirectUri);
  const recent = isRecent(connection.lastActiveAt);
  const canDisconnect = canManageAll || connection.isCurrentUser;

  return (
    <li className="group relative flex flex-col gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-surface-hover sm:flex-row sm:items-center sm:gap-4">
      <span
        className="pointer-events-none absolute inset-y-3 left-0 w-0.5 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ backgroundColor: brand.accent }}
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <LogoTile brand={brand} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium text-foreground">
              {brand.name}
            </span>
            {canManageAll &&
              (connection.isCurrentUser ? (
                <span className="rounded-full bg-accent/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-accent">
                  You
                </span>
              ) : (
                <span
                  className="max-w-48 truncate text-xs text-foreground-muted"
                  title={connection.userEmail ?? undefined}
                >
                  {memberLabel(connection)}
                </span>
              ))}
            <span className="flex flex-wrap gap-1">
              {connection.scopes.includes("mcp:memories") && (
                <Chip icon={<Brain />}>Memories</Chip>
              )}
              {connection.scopes.includes("offline_access") && (
                <Chip icon={<RefreshCw />}>Stays signed in</Chip>
              )}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-subtle">
            <span
              className="inline-flex items-center gap-1.5"
              title={absolute(connection.lastActiveAt)}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  recent
                    ? "bg-success shadow-[0_0_6px_var(--success)]"
                    : "bg-foreground-subtle/50",
                )}
                aria-hidden
              />
              Last active {formatRelativeTime(connection.lastActiveAt)}
            </span>
            <span
              className="inline-flex items-center gap-1"
              title={absolute(connection.connectedAt)}
            >
              <Clock className="h-3 w-3" aria-hidden />
              Connected {formatRelativeTime(connection.connectedAt)}
            </span>
            {target && (
              <span
                className="inline-flex min-w-0 items-center gap-1"
                title={connection.redirectUri ?? undefined}
              >
                <Globe className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{target}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {canDisconnect && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDisconnect(connection)}
          aria-label={`Disconnect ${brand.name}`}
          className="h-8 shrink-0 cursor-pointer gap-1.5 self-start text-foreground-muted hover:translate-y-0 hover:border-error/40 hover:bg-error/5 hover:text-error hover:shadow-none sm:self-auto"
        >
          <Unplug className="h-3.5 w-3.5" />
          Disconnect
        </Button>
      )}
    </li>
  );
}

function DisconnectDialog({
  connection,
  workspaceName,
  isPending,
  onClose,
  onConfirm,
}: {
  connection: McpConnection;
  workspaceName: string;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const brand = getClientBrand(connection);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isPending ? undefined : onClose}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="disconnect-title"
        aria-describedby="disconnect-desc"
        className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl animate-scale-in"
      >
        <button
          onClick={onClose}
          disabled={isPending}
          aria-label="Close"
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-4 p-5">
          <LogoTile brand={brand} size="lg" />
          <div>
            <h3
              id="disconnect-title"
              className="text-lg font-semibold tracking-tight"
            >
              Disconnect {brand.name}?
            </h3>
            <p
              id="disconnect-desc"
              className="mt-1.5 text-sm text-foreground-muted"
            >
              {connection.isCurrentUser ? (
                <>
                  {brand.name} will lose access to{" "}
                  <span className="font-medium text-foreground">
                    {workspaceName}
                  </span>{" "}
                  right away.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {memberLabel(connection)}
                  </span>
                  {"'s "}
                  {brand.name} connection to{" "}
                  <span className="font-medium text-foreground">
                    {workspaceName}
                  </span>{" "}
                  will be revoked right away.
                </>
              )}{" "}
              Reconnecting requires signing in again.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3.5">
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="cursor-pointer hover:translate-y-0 hover:shadow-none"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="cursor-pointer hover:translate-y-0 hover:shadow-none"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <ul className="divide-y divide-border" aria-hidden>
      {[0, 1].map((i) => (
        <li key={i} className="flex items-center gap-3.5 px-4 py-3.5">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-surface-elevated" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-32 animate-pulse rounded bg-surface-elevated" />
            <div className="h-3 w-56 max-w-full animate-pulse rounded bg-surface-elevated" />
          </div>
          <div className="hidden h-8 w-28 animate-pulse rounded-lg bg-surface-elevated sm:block" />
        </li>
      ))}
    </ul>
  );
}

function StatePanel({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background-secondary text-foreground-muted [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-foreground-muted">
        {description}
      </p>
      <div className="mt-5">{action}</div>
    </div>
  );
}

export function McpConnections() {
  const toast = useToast();
  const {
    activeWorkspace,
    activeWorkspaceId,
    isLoading: workspaceLoading,
  } = useWorkspace();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery(
    mcpConnectionsQueryOptions(activeWorkspaceId),
  );
  const disconnect = useDisconnectMcpConnection();
  const [pending, setPending] = useState<McpConnection | null>(null);

  if (!workspaceLoading && !activeWorkspaceId) return null;

  const workspaceName = activeWorkspace?.name ?? "this workspace";
  const connections = data?.connections ?? [];

  async function handleConfirm() {
    if (!pending) return;
    const name = getClientBrand(pending).name;
    try {
      await disconnect.mutateAsync({
        id: pending.id,
        workspaceId: activeWorkspaceId,
      });
      toast.success(`${name} disconnected`);
      setPending(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to disconnect ${name}`,
      );
    }
  }

  return (
    <section aria-labelledby="active-connections-title">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id="active-connections-title"
              className="text-base font-semibold tracking-tight"
            >
              Active connections
            </h2>
            {data && (
              <span className="rounded-full border border-border bg-surface-elevated px-2 py-px text-[11px] font-medium tabular-nums text-foreground-muted">
                {connections.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Apps connected to{" "}
            <span className="font-medium text-foreground">{workspaceName}</span>{" "}
            with OAuth. Disconnecting signs the app out immediately.
          </p>
        </div>
        {connections.length > 0 && (
          <Link
            href="/mcp/oauth"
            className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-foreground-muted outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <Plus className="h-3.5 w-3.5" />
            Connect an app
          </Link>
        )}
      </div>

      <div
        className="overflow-hidden rounded-xl border border-border bg-surface"
        aria-busy={isLoading || workspaceLoading}
      >
        {isLoading || workspaceLoading ? (
          <SkeletonRows />
        ) : isError ? (
          <StatePanel
            icon={<AlertTriangle />}
            title="Couldn't load connections"
            description="Something went wrong while fetching the apps connected to this workspace."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="cursor-pointer gap-1.5 hover:translate-y-0 hover:shadow-none"
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")}
                />
                Try again
              </Button>
            }
          />
        ) : connections.length === 0 ? (
          <StatePanel
            icon={<Unplug />}
            title="No apps connected yet"
            description="Connect Claude, ChatGPT, Cursor, or another MCP client with OAuth and it will show up here."
            action={
              <Link
                href="/mcp/oauth"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground shadow-sm outline-none transition-shadow duration-200 hover:shadow-[0_4px_20px_var(--accent-glow)] focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Connect with OAuth
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {connections.map((connection) => (
              <ConnectionRow
                key={connection.id}
                connection={connection}
                canManageAll={data?.canManageAll ?? false}
                onDisconnect={setPending}
              />
            ))}
          </ul>
        )}
      </div>

      {pending && (
        <DisconnectDialog
          connection={pending}
          workspaceName={workspaceName}
          isPending={disconnect.isPending}
          onClose={() => setPending(null)}
          onConfirm={handleConfirm}
        />
      )}
    </section>
  );
}
