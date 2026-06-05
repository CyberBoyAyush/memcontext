"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Buildings,
  Check,
  Copy,
  Plus,
  Trash,
  UserPlus,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { ThemedSelect } from "@/components/ui/themed-select";
import { cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";
import {
  useCreateWorkspace,
  useInviteWorkspaceMember,
  useRemoveWorkspaceMember,
  useRevokeWorkspaceInvitation,
  useUpdateWorkspaceBillingOwner,
  useUpdateWorkspaceMember,
  workspaceTeamQueryOptions,
  workspacesQueryOptions,
  type InvitableWorkspaceRole,
  type WorkspaceRole,
} from "@/lib/queries/company-brain";

type InviteRole = InvitableWorkspaceRole;

const roleOptions: Array<{ value: InviteRole; label: string; hint: string }> = [
  { value: "admin", label: "Admin", hint: "Manage members and content" },
  { value: "member", label: "Member", hint: "Add and search knowledge" },
  { value: "viewer", label: "Viewer", hint: "Read-only access" },
];

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-surface-elevated/50 px-3 text-sm transition-colors placeholder:text-foreground-subtle focus:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent/20";

interface SubscriptionData {
  plan: string;
  workspaceCount: number;
  workspaceLimit: number;
}

function roleBadgeTone(role: string) {
  if (role === "owner") return "bg-accent/10 text-accent border-accent/20";
  if (role === "admin") return "bg-success/10 text-success border-success/20";
  return "bg-surface-elevated text-foreground-muted border-border";
}

function canManageMember(
  managerRole?: WorkspaceRole,
  targetRole?: WorkspaceRole,
) {
  if (!managerRole || !targetRole || targetRole === "owner") return false;
  if (managerRole === "owner") return true;
  return managerRole === "admin" && targetRole !== "admin";
}

function formatPlanName(plan?: string) {
  if (!plan) return "Your current plan";
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`;
}

function workspaceTierLabel(workspace: { billingOwnerPlan?: string | null }) {
  const plan = workspace.billingOwnerPlan ?? "free";
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1)} Workspace`;
}

export function WorkspacesSection({ embedded }: { embedded?: boolean } = {}) {
  const toast = useToast();
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [copiedWorkspaceId, setCopiedWorkspaceId] = useState<string | null>(
    null,
  );

  const { data: workspaceData } = useQuery(workspacesQueryOptions());
  const createWorkspace = useCreateWorkspace();
  const inviteMember = useInviteWorkspaceMember();
  const updateBillingOwner = useUpdateWorkspaceBillingOwner();
  const updateMember = useUpdateWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();
  const revokeInvitation = useRevokeWorkspaceInvitation();
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
  });

  const workspaces = useMemo(
    () => workspaceData?.workspaces ?? [],
    [workspaceData],
  );
  const activeWorkspaceId = selectedWorkspaceId || workspaces[0]?.id || "";
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const canInvite =
    activeWorkspace?.role === "owner" || activeWorkspace?.role === "admin";
  const { data: teamData, isLoading: teamLoading } = useQuery(
    workspaceTeamQueryOptions(activeWorkspaceId),
  );
  const canManageTeam =
    teamData?.currentUserRole === "owner" ||
    teamData?.currentUserRole === "admin";
  const workspaceLimitReached =
    !!subscription &&
    subscription.workspaceLimit > 0 &&
    subscription.workspaceCount >= subscription.workspaceLimit;

  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) return;
    if (workspaceLimitReached) {
      toast.error("Workspace limit reached. Upgrade your plan to create more.");
      return;
    }
    try {
      const result = await createWorkspace.mutateAsync(workspaceName.trim());
      setSelectedWorkspaceId(result.workspace.id);
      setWorkspaceName("");
      toast.success(`Workspace "${result.workspace.name}" created`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        message.toLowerCase().includes("workspace limit")
          ? "Workspace limit reached. Upgrade your plan to create more."
          : "Could not create workspace",
      );
    }
  }

  async function handleInvite() {
    if (!activeWorkspaceId || !inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync({
        workspaceId: activeWorkspaceId,
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail("");
      toast.success("Invite email sent");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send invite",
      );
    }
  }

  async function handleCopyWorkspaceId(workspaceId: string) {
    try {
      await navigator.clipboard.writeText(workspaceId);
      setCopiedWorkspaceId(workspaceId);
      toast.success("Workspace ID copied");
      window.setTimeout(() => {
        setCopiedWorkspaceId((current) =>
          current === workspaceId ? null : current,
        );
      }, 2000);
    } catch {
      toast.error("Failed to copy workspace ID");
    }
  }

  async function handleUpdateMemberRole(
    memberId: string,
    role: InvitableWorkspaceRole,
  ) {
    try {
      await updateMember.mutateAsync({
        workspaceId: activeWorkspaceId,
        memberId,
        role,
      });
      toast.success("Member role updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update member",
      );
    }
  }

  async function handleUpdateBillingOwner(nextUserId: string) {
    if (!activeWorkspaceId || !nextUserId) return;
    try {
      await updateBillingOwner.mutateAsync({
        workspaceId: activeWorkspaceId,
        userId: nextUserId,
      });
      toast.success("Billing owner updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update billing owner",
      );
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      await removeMember.mutateAsync({
        workspaceId: activeWorkspaceId,
        memberId,
      });
      toast.success("Member removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove member",
      );
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    try {
      await revokeInvitation.mutateAsync({
        workspaceId: activeWorkspaceId,
        invitationId,
      });
      toast.success("Invite revoked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not revoke invite",
      );
    }
  }

  const inner = (
    <div className="space-y-6">
      {/* Create workspace */}
      <div>
        <h3 className="text-sm font-semibold">Create a workspace</h3>
        <p className="mt-0.5 text-xs text-foreground-subtle">
          Each workspace is isolated. Your plan controls how many workspaces you
          can own.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={workspaceName}
            onChange={(event) => setWorkspaceName(event.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
            placeholder="Acme Inc"
            disabled={workspaceLimitReached}
            className={inputClass}
          />
          <Button
            onClick={handleCreateWorkspace}
            disabled={
              createWorkspace.isPending ||
              workspaceLimitReached ||
              !workspaceName.trim()
            }
            className="sm:w-auto"
          >
            <Plus className="h-4 w-4" weight="bold" />
            {createWorkspace.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
        {workspaceLimitReached && (
          <div className="mt-3 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-xs text-accent">
            {formatPlanName(subscription.plan)} includes{" "}
            {subscription.workspaceLimit} workspace
            {subscription.workspaceLimit === 1 ? "" : "s"}.{" "}
            <Link href="/subscription" className="font-semibold underline">
              Upgrade your plan
            </Link>{" "}
            to create more.
          </div>
        )}
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
                        {workspace.slug} · {workspaceTierLabel(workspace)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyWorkspaceId(workspace.id)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium text-foreground-muted transition-colors hover:border-border-hover hover:text-foreground"
                      aria-label={`Copy workspace ID for ${workspace.name}`}
                    >
                      {copiedWorkspaceId === workspace.id ? (
                        <Check className="h-3.5 w-3.5 text-success" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="hidden sm:inline">
                        {copiedWorkspaceId === workspace.id
                          ? "Copied"
                          : "Copy ID"}
                      </span>
                    </button>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                        roleBadgeTone(workspace.role),
                      )}
                    >
                      {workspace.role}
                    </span>
                  </div>
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
                    ? "Send an email invite to a teammate."
                    : "Only owners and admins can invite members."}
                </p>
              </div>
              <ThemedSelect
                value={activeWorkspaceId}
                onChange={setSelectedWorkspaceId}
                className="w-44 shrink-0"
                options={workspaces.map((workspace) => ({
                  value: workspace.id,
                  label: workspace.name,
                }))}
              />
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
                        <Check className="h-3 w-3 text-accent" weight="bold" />
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

            <p className="mt-2 text-[11px] text-foreground-subtle">
              The teammate is added only after accepting the email invite.
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Team management */}
          <div>
            <h3 className="text-sm font-semibold">Team members</h3>
            <p className="mt-0.5 text-xs text-foreground-subtle">
              Review members, update roles, remove access, or revoke pending
              invites.
            </p>

            {teamData?.members.length ? (
              <div className="mt-3 rounded-xl border border-border bg-surface-elevated/30 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold">Billing owner</p>
                    <p className="mt-0.5 text-[11px] text-foreground-subtle">
                      Workspace documents use this member&apos;s plan limits.
                    </p>
                  </div>
                  <ThemedSelect
                    value={teamData.billingOwnerUserId ?? ""}
                    disabled={!canManageTeam || updateBillingOwner.isPending}
                    onChange={handleUpdateBillingOwner}
                    align="right"
                    className="w-full sm:w-52"
                    options={teamData.members
                      .filter((member) => member.role !== "viewer")
                      .map((member) => ({
                        value: member.userId,
                        label: member.name || member.email,
                      }))}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-3 divide-y divide-border rounded-xl border border-border">
              {teamLoading ? (
                <div className="p-3 text-sm text-foreground-subtle">
                  Loading team...
                </div>
              ) : teamData?.members.length ? (
                teamData.members.map((member) => {
                  const manageable = canManageMember(
                    teamData.currentUserRole,
                    member.role,
                  );

                  return (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {member.name || member.email}
                        </p>
                        <p className="truncate text-xs text-foreground-subtle">
                          {member.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ThemedSelect
                          value={member.role}
                          disabled={!manageable || updateMember.isPending}
                          capitalize
                          className="w-32"
                          onChange={(next) =>
                            handleUpdateMemberRole(
                              member.id,
                              next as InvitableWorkspaceRole,
                            )
                          }
                          options={[
                            { value: "owner", label: "Owner", disabled: true },
                            { value: "admin", label: "Admin" },
                            { value: "member", label: "Member" },
                            { value: "viewer", label: "Viewer" },
                          ]}
                        />
                        <button
                          type="button"
                          disabled={!manageable || removeMember.isPending}
                          onClick={() => handleRemoveMember(member.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-muted transition-colors hover:border-red-500/40 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Remove ${member.email}`}
                        >
                          <Trash className="h-3.5 w-3.5" weight="bold" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-sm text-foreground-subtle">
                  No members found.
                </div>
              )}
            </div>

            {teamData?.invitations.length ? (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  Pending invites
                </h4>
                <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                  {teamData.invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between gap-3 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {invitation.email}
                        </p>
                        <p className="truncate text-xs text-foreground-subtle">
                          {invitation.role} invite · expires{" "}
                          {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!canManageTeam || revokeInvitation.isPending}
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-red-500/40 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
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
