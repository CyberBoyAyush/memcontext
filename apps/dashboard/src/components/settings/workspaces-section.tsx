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

const roleOptions: Array<{ value: InviteRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
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

export function WorkspacesSection({
  embedded,
  initialTab = "team",
}: { embedded?: boolean; initialTab?: "team" | "workspaces" } = {}) {
  const toast = useToast();
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [copiedWorkspaceId, setCopiedWorkspaceId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"team" | "workspaces">(
    initialTab,
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

  const workspacesTab = (
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
      )}
    </div>
  );

  const teamTab =
    workspaces.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border bg-surface-elevated/30 p-6 text-center">
        <p className="text-sm text-foreground-muted">
          Create a workspace first to manage team members.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setActiveTab("workspaces")}
        >
          Go to Workspaces
        </Button>
      </div>
    ) : (
      <div className="space-y-6">
        {/* Manage team — invite + members + invites in one section */}
          <div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Manage team</h3>
                <p className="mt-0.5 text-xs text-foreground-subtle">
                  {canInvite
                    ? "Invite teammates, update roles, or remove access."
                    : "Only owners and admins can invite or manage members."}
                </p>
              </div>
              <ThemedSelect
                value={activeWorkspaceId}
                onChange={setSelectedWorkspaceId}
                className="w-full shrink-0 sm:w-44"
                options={workspaces.map((workspace) => ({
                  value: workspace.id,
                  label: workspace.name,
                }))}
              />
            </div>

            {/* Invite row */}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                placeholder="teammate@company.com"
                disabled={!canInvite}
                className={cn(
                  inputClass,
                  "flex-1 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <ThemedSelect
                value={inviteRole}
                disabled={!canInvite}
                onChange={(next) => setInviteRole(next as InviteRole)}
                buttonClassName="h-10"
                className="w-full shrink-0 sm:w-32"
                options={roleOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
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

            {/* Team members count */}
            {teamData?.members.length ? (
              <div className="mt-4 flex items-baseline justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  Members
                </h4>
                <span className="text-xs text-foreground-muted">
                  {teamData.members.length} member
                  {teamData.members.length === 1 ? "" : "s"}
                </span>
              </div>
            ) : null}

            <div className="mt-2 overflow-x-auto rounded-xl border border-border">
              {teamLoading ? (
                <div className="p-4 text-sm text-foreground-subtle">
                  Loading team...
                </div>
              ) : teamData?.members.length ? (
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead className="border-b border-border bg-surface-elevated">
                    <tr className="h-10 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                      <th className="w-10 border-r border-border px-3 text-center">
                        #
                      </th>
                      <th className="border-r border-border px-3">Member</th>
                      <th className="w-36 border-r border-border px-3">Role</th>
                      <th className="w-16 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamData.members.map((member, index) => {
                      const manageable = canManageMember(
                        teamData.currentUserRole,
                        member.role,
                      );
                      return (
                        <tr
                          key={member.id}
                          className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-elevated/40"
                        >
                          <td className="w-10 border-r border-border px-3 py-2.5 text-center align-middle text-xs font-medium tabular-nums text-foreground-muted">
                            {index + 1}
                          </td>
                          <td className="border-r border-border px-3 py-2.5 align-middle">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {member.name || member.email}
                              </p>
                              <p className="truncate text-xs text-foreground-subtle">
                                {member.email}
                              </p>
                            </div>
                          </td>
                          <td className="w-36 border-r border-border px-3 py-2.5 align-middle">
                            <ThemedSelect
                              value={member.role}
                              disabled={!manageable || updateMember.isPending}
                              capitalize
                              buttonClassName="h-8"
                              className="w-full"
                              onChange={(next) =>
                                handleUpdateMemberRole(
                                  member.id,
                                  next as InvitableWorkspaceRole,
                                )
                              }
                              options={[
                                {
                                  value: "owner",
                                  label: "Owner",
                                  disabled: true,
                                },
                                { value: "admin", label: "Admin" },
                                { value: "member", label: "Member" },
                                { value: "viewer", label: "Viewer" },
                              ]}
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center align-middle">
                            <button
                              type="button"
                              disabled={
                                !manageable || removeMember.isPending
                              }
                              onClick={() => handleRemoveMember(member.id)}
                              title={`Remove ${member.email}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash className="h-4 w-4" weight="duotone" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-sm text-foreground-subtle">
                  No members found.
                </div>
              )}
            </div>

            {/* Billing owner — inline line */}
            {teamData?.members.length ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-foreground-muted">
                  <span className="font-medium text-foreground">
                    Billing owner
                  </span>{" "}
                  · workspace documents use this member&apos;s plan limits.
                </p>
                <ThemedSelect
                  value={teamData.billingOwnerUserId ?? ""}
                  disabled={!canManageTeam || updateBillingOwner.isPending}
                  onChange={handleUpdateBillingOwner}
                  align="right"
                  buttonClassName="h-8"
                  className="w-full sm:w-52"
                  options={teamData.members
                    .filter((member) => member.role !== "viewer")
                    .map((member) => ({
                      value: member.userId,
                      label: member.name || member.email,
                    }))}
                />
              </div>
            ) : null}

            {teamData?.invitations.length ? (
              <div className="mt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                  Pending invites
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead className="border-b border-border bg-surface-elevated">
                      <tr className="h-10 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
                        <th className="border-r border-border px-3">Email</th>
                        <th className="w-24 border-r border-border px-3">
                          Role
                        </th>
                        <th className="w-32 border-r border-border px-3">
                          Expires
                        </th>
                        <th className="w-16 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.invitations.map((invitation) => (
                        <tr
                          key={invitation.id}
                          className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-elevated/40"
                        >
                          <td className="border-r border-border px-3 py-2.5 align-middle">
                            <p className="truncate text-sm font-medium">
                              {invitation.email}
                            </p>
                          </td>
                          <td className="w-24 border-r border-border px-3 py-2.5 align-middle text-xs capitalize text-foreground-muted">
                            {invitation.role}
                          </td>
                          <td className="w-32 border-r border-border px-3 py-2.5 align-middle text-xs text-foreground-muted">
                            {new Date(
                              invitation.expiresAt,
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5 text-center align-middle">
                            <button
                              type="button"
                              disabled={
                                !canManageTeam || revokeInvitation.isPending
                              }
                              onClick={() =>
                                handleRevokeInvitation(invitation.id)
                              }
                              title={`Revoke invite for ${invitation.email}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash className="h-4 w-4" weight="duotone" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
      </div>
    );

  const inner = (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-elevated/50 p-1">
        {(
          [
            { value: "team", label: "Team" },
            { value: "workspaces", label: "Workspaces" },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium transition-all",
                active
                  ? "bg-accent text-white shadow-sm"
                  : "text-foreground-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "team" ? teamTab : workspacesTab}
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
