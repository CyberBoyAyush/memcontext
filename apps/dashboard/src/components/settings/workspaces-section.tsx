"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Buildings,
  CaretDown,
  Check,
  Copy,
  Plus,
  UserPlus,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  useCreateWorkspace,
  useInviteWorkspaceMember,
  workspacesQueryOptions,
} from "@/lib/queries/company-brain";

type InviteRole = "admin" | "member" | "viewer";

const roleOptions: Array<{ value: InviteRole; label: string; hint: string }> = [
  { value: "admin", label: "Admin", hint: "Manage members and content" },
  { value: "member", label: "Member", hint: "Add and search knowledge" },
  { value: "viewer", label: "Viewer", hint: "Read-only access" },
];

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-surface-elevated/50 px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20";

function roleBadgeTone(role: string) {
  if (role === "owner") return "bg-accent/10 text-accent border-accent/20";
  if (role === "admin") return "bg-success/10 text-success border-success/20";
  return "bg-surface-elevated text-foreground-muted border-border";
}

export function WorkspacesSection({ embedded }: { embedded?: boolean } = {}) {
  const toast = useToast();
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteToken, setInviteToken] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);

  const { data: workspaceData } = useQuery(workspacesQueryOptions());
  const createWorkspace = useCreateWorkspace();
  const inviteMember = useInviteWorkspaceMember();

  const workspaces = useMemo(
    () => workspaceData?.workspaces ?? [],
    [workspaceData],
  );
  const activeWorkspaceId = selectedWorkspaceId || workspaces[0]?.id || "";
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const canInvite =
    activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";

  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) return;
    try {
      const result = await createWorkspace.mutateAsync(workspaceName.trim());
      setSelectedWorkspaceId(result.workspace.id);
      setWorkspaceName("");
      toast.success(`Workspace "${result.workspace.name}" created`);
    } catch {
      toast.error("Could not create workspace");
    }
  }

  async function handleInvite() {
    if (!activeWorkspaceId || !inviteEmail.trim()) return;
    try {
      const result = await inviteMember.mutateAsync({
        workspaceId: activeWorkspaceId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteToken(result.token);
      setInviteEmail("");
      setTokenCopied(false);
      toast.success("Invite created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send invite",
      );
    }
  }

  async function copyToken() {
    if (!inviteToken) return;
    await navigator.clipboard.writeText(inviteToken);
    setTokenCopied(true);
    toast.success("Invite token copied");
    setTimeout(() => setTokenCopied(false), 2000);
  }

  const inner = (
    <div className="space-y-6">
      {/* Create workspace */}
          <div>
            <h3 className="text-sm font-semibold">Create a workspace</h3>
            <p className="mt-0.5 text-xs text-foreground-subtle">
              Each workspace is an isolated knowledge brain for a team.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
                placeholder="Acme Inc"
                className={inputClass}
              />
              <Button
                onClick={handleCreateWorkspace}
                disabled={createWorkspace.isPending || !workspaceName.trim()}
                className="sm:w-auto"
              >
                <Plus className="h-4 w-4" weight="bold" />
                {createWorkspace.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>

          {workspaces.length > 0 && (
            <>
              <div className="h-px bg-border" />

              {/* Workspace + role list */}
              <div>
                <h3 className="text-sm font-semibold">Your workspaces</h3>
                <div className="mt-3 divide-y divide-border rounded-xl border border-border">
                  {workspaces.map((workspace) => (
                    <div
                      key={workspace.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-elevated border border-border">
                          <Buildings
                            className="h-4 w-4 text-foreground-muted"
                            weight="duotone"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {workspace.name}
                          </p>
                          <p className="truncate text-xs text-foreground-subtle">
                            {workspace.slug}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                          roleBadgeTone(workspace.role),
                        )}
                      >
                        {workspace.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Invite member */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Invite a member</h3>
                    <p className="mt-0.5 text-xs text-foreground-subtle">
                      {canInvite
                        ? "Send an invite token to a teammate."
                        : "Only owners and admins can invite members."}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <select
                      value={activeWorkspaceId}
                      onChange={(event) =>
                        setSelectedWorkspaceId(event.target.value)
                      }
                      className="h-9 w-40 appearance-none rounded-lg border border-border bg-surface pl-3 pr-8 text-xs font-medium transition-colors hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {workspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-foreground-muted"
                      weight="bold"
                    />
                  </div>
                </div>

                {/* Role picker */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {roleOptions.map((option) => {
                    const active = inviteRole === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setInviteRole(option.value)}
                        disabled={!canInvite}
                        className={cn(
                          "rounded-lg border p-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                          active
                            ? "border-accent bg-accent/[0.06]"
                            : "border-border bg-surface hover:border-border-hover",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              active ? "text-accent" : "text-foreground",
                            )}
                          >
                            {option.label}
                          </span>
                          {active && (
                            <Check
                              className="h-3 w-3 text-accent"
                              weight="bold"
                            />
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] leading-tight text-foreground-subtle">
                          {option.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                    placeholder="teammate@company.com"
                    disabled={!canInvite}
                    className={cn(
                      inputClass,
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  />
                  <Button
                    onClick={handleInvite}
                    disabled={
                      inviteMember.isPending ||
                      !canInvite ||
                      !activeWorkspaceId ||
                      !inviteEmail
                    }
                    className="sm:w-auto"
                  >
                    <UserPlus className="h-4 w-4" weight="bold" />
                    {inviteMember.isPending ? "Inviting..." : "Invite"}
                  </Button>
                </div>

                {inviteToken && (
                  <button
                    onClick={copyToken}
                    className="mt-3 flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface-elevated/50 p-2.5 text-left transition-colors hover:border-border-hover"
                  >
                    <code className="truncate text-xs text-foreground-muted">
                      {inviteToken}
                    </code>
                    {tokenCopied ? (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-success"
                        weight="bold"
                      />
                    ) : (
                      <Copy
                        className="h-3.5 w-3.5 shrink-0 text-foreground-muted"
                        weight="bold"
                      />
                    )}
                  </button>
                )}
              </div>
            </>
          )}
    </div>
  );

  if (embedded) {
    return inner;
  }

  return (
    <Card className="shadow-none">
      <CardContent className="p-6">{inner}</CardContent>
    </Card>
  );
}
