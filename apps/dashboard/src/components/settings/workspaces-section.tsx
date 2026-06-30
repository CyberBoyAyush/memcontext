"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Buildings,
  Check,
  Copy,
  Plus,
  SpinnerGap,
  Trash,
  UserPlus,
  Warning,
  X,
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
} from "@/lib/queries/context-vault";
import { useWorkspace } from "@/providers/workspace-provider";

type InviteRole = InvitableWorkspaceRole;
type WorkspaceDialogMode = "add" | "manage";

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

export function WorkspacesSection({ embedded }: { embedded?: boolean } = {}) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const requestedWorkspaceAction = searchParams.get("workspaceAction");
  const initialDialogMode: WorkspaceDialogMode =
    requestedWorkspaceAction === "add" ? "add" : "manage";
  const { activeWorkspaceId: mountedWorkspaceId, setActiveWorkspaceId } =
    useWorkspace();
  const [workspaceName, setWorkspaceName] = useState("");
  const createWorkspaceInputRef = useRef<HTMLInputElement | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [manageOpen, setManageOpen] = useState(
    requestedWorkspaceAction === "add" || requestedWorkspaceAction === "manage",
  );
  const [dialogMode, setDialogMode] =
    useState<WorkspaceDialogMode>(initialDialogMode);
  const [copiedWorkspaceId, setCopiedWorkspaceId] = useState<string | null>(
    null,
  );
  const [pendingRemoval, setPendingRemoval] = useState<
    | {
        kind: "member";
        id: string;
        name: string;
        email: string;
      }
    | {
        kind: "invite";
        id: string;
        email: string;
      }
    | null
  >(null);

  const { data: workspaceData } = useQuery(workspacesQueryOptions());
  const createWorkspace = useCreateWorkspace();
  const inviteMember = useInviteWorkspaceMember();
  const updateBillingOwner = useUpdateWorkspaceBillingOwner();
  const updateMember = useUpdateWorkspaceMember();
  const removeMember = useRemoveWorkspaceMember();
  const revokeInvitation = useRevokeWorkspaceInvitation();
  const workspaces = useMemo(
    () => workspaceData?.workspaces ?? [],
    [workspaceData],
  );
  const activeWorkspaceId = mountedWorkspaceId || "";
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const { data: subscription } = useQuery({
    queryKey: ["subscription", activeWorkspaceId],
    queryFn: () =>
      api.get<SubscriptionData>(
        `/api/user/subscription?workspaceId=${activeWorkspaceId}`,
      ),
    enabled: !!activeWorkspaceId,
  });
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

  useEffect(() => {
    if (!manageOpen || dialogMode !== "add") return;
    window.setTimeout(() => createWorkspaceInputRef.current?.focus(), 0);
  }, [dialogMode, manageOpen]);

  useEffect(() => {
    if (requestedWorkspaceAction !== "add" && requestedWorkspaceAction !== "manage") {
      return;
    }
    const id = window.setTimeout(() => {
      setDialogMode(requestedWorkspaceAction);
      setManageOpen(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [requestedWorkspaceAction]);

  function openWorkspaceDialog(mode: WorkspaceDialogMode) {
    setDialogMode(mode);
    setManageOpen(true);
  }

  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) return;
    if (workspaceLimitReached) {
      toast.error("Workspace limit reached. Upgrade your plan to create more.");
      return;
    }
    try {
      const result = await createWorkspace.mutateAsync(workspaceName.trim());
      setActiveWorkspaceId(result.workspace.id);
      setWorkspaceName("");
      setManageOpen(false);
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

  async function handleConfirmRemoval() {
    if (!pendingRemoval) return;
    try {
      if (pendingRemoval.kind === "member") {
        await removeMember.mutateAsync({
          workspaceId: activeWorkspaceId,
          memberId: pendingRemoval.id,
        });
        toast.success("Member removed");
      } else {
        await revokeInvitation.mutateAsync({
          workspaceId: activeWorkspaceId,
          invitationId: pendingRemoval.id,
        });
        toast.success("Invite revoked");
      }
      setPendingRemoval(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : pendingRemoval.kind === "member"
            ? "Could not remove member"
            : "Could not revoke invite",
      );
    }
  }

  const workspaceManagement = (
    <div className="space-y-6">
      {/* Create workspace */}
      <div>
        <h3 className="text-sm font-semibold">Create a workspace</h3>
        <p className="mt-0.5 text-xs text-foreground-subtle">
          Workspaces are separate accounts. Create another one only when you need
          a separate team, billing boundary, and memory pool.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            ref={createWorkspaceInputRef}
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
            {formatPlanName(subscription.plan)} includes {subscription.workspaceLimit} workspace
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
          <p className="mt-0.5 text-xs text-foreground-subtle">
            Switch the active workspace from the sidebar workspace switcher.
          </p>
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
          onClick={() => openWorkspaceDialog("add")}
        >
          Create workspace
        </Button>
      </div>
    ) : !activeWorkspaceId ? (
      <div className="rounded-xl border border-dashed border-border bg-surface-elevated/30 p-6 text-center">
        <p className="text-sm text-foreground-muted">
          Select an active workspace from the sidebar to manage its team.
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => openWorkspaceDialog("manage")}
        >
          Manage workspaces
        </Button>
      </div>
    ) : (
      <div className="space-y-6">
        {/* Manage team: invite + members + invites in one section */}
          <div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Manage team</h3>
                <p className="mt-0.5 text-xs text-foreground-subtle">
                  {activeWorkspace?.name
                    ? `Active workspace: ${activeWorkspace.name}`
                    : "Manage the currently mounted workspace."}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openWorkspaceDialog("add")}
                  className="sm:w-auto"
                >
                  <Plus className="h-4 w-4" weight="bold" />
                  Add workspace
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openWorkspaceDialog("manage")}
                  className="sm:w-auto"
                >
                  <Buildings className="h-4 w-4" weight="duotone" />
                  Manage workspaces
                </Button>
              </div>
            </div>

            <p className="mt-2 text-xs text-foreground-subtle">
              {canInvite
                ? "Invite teammates, update roles, or remove access for this workspace."
                : "Only owners and admins can invite or manage members in this workspace."}
            </p>

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
                              onClick={() =>
                                setPendingRemoval({
                                  kind: "member",
                                  id: member.id,
                                  name: member.name || member.email,
                                  email: member.email,
                                })
                              }
                              title={`Remove ${member.email}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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

            {/* Billing owner: inline line */}
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
                                setPendingRemoval({
                                  kind: "invite",
                                  id: invitation.id,
                                  email: invitation.email,
                                })
                              }
                              title={`Revoke invite for ${invitation.email}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
      {teamTab}

      {manageOpen && (
        <ManageWorkspacesDialog
          mode={dialogMode}
          onClose={() => setManageOpen(false)}
        >
          {workspaceManagement}
        </ManageWorkspacesDialog>
      )}

      {pendingRemoval && (
        <RemoveConfirmDialog
          pending={pendingRemoval}
          isWorking={removeMember.isPending || revokeInvitation.isPending}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={handleConfirmRemoval}
        />
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

function ManageWorkspacesDialog({
  children,
  mode,
  onClose,
}: {
  children: ReactNode;
  mode: WorkspaceDialogMode;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-workspaces-dialog-title"
        className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-border bg-background shadow-2xl animate-scale-in"
      >
        <div className="flex items-start justify-between border-b border-border p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
              <Buildings className="h-5 w-5 text-accent" weight="duotone" />
            </div>
            <div className="min-w-0 pt-1">
              <h3
                id="manage-workspaces-dialog-title"
                className="text-base font-semibold leading-tight"
              >
                Manage workspaces
              </h3>
              <p className="mt-0.5 text-xs text-foreground-muted">
                {mode === "add"
                  ? "Name a new workspace to create a separate team, billing boundary, and memory pool."
                  : "Review your workspaces. Switch the active one from the sidebar."}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Close manage workspaces dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(85vh-84px)] overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function RemoveConfirmDialog({
  pending,
  isWorking,
  onCancel,
  onConfirm,
}: {
  pending:
    | { kind: "member"; id: string; name: string; email: string }
    | { kind: "invite"; id: string; email: string };
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const isMember = pending.kind === "member";
  const title = isMember ? "Remove member" : "Revoke invite";
  const subjectName = isMember ? pending.name : pending.email;
  const subjectEmail = pending.email;
  const verb = isMember ? "remove" : "revoke the invite for";
  const consequence = isMember
    ? "They will immediately lose access to this workspace and its memories. You can re-invite them later."
    : "The invitation link will stop working. You can send a new invite later.";

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isWorking) {
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isWorking, onCancel]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isWorking ? undefined : onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-member-dialog-title"
        className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-0">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-error/10 shrink-0">
              <Warning
                className="h-5 w-5 text-error"
                weight="duotone"
              />
            </div>
            <div className="min-w-0 pt-1">
              <h3
                id="remove-member-dialog-title"
                className="text-base font-semibold leading-tight"
              >
                {title}
              </h3>
              <p className="text-xs text-foreground-muted mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isWorking}
            className="p-1 rounded-md text-foreground-muted hover:text-foreground hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-foreground-muted leading-relaxed">
            Are you sure you want to {verb}{" "}
            <span className="font-medium text-foreground">{subjectName}</span>
            {isMember && subjectName !== subjectEmail && (
              <>
                {" "}
                <span className="text-foreground-subtle">
                  ({subjectEmail})
                </span>
              </>
            )}
            ?
          </p>
          <p className="text-xs text-foreground-subtle leading-relaxed">
            {consequence}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 pt-0">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isWorking}
            className="hover:translate-y-0 hover:shadow-none cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isWorking}
            className="hover:translate-y-0 hover:shadow-none cursor-pointer"
          >
            {isWorking ? (
              <>
                <SpinnerGap
                  className="h-3.5 w-3.5 animate-spin mr-1.5"
                  weight="bold"
                />
                {isMember ? "Removing..." : "Revoking..."}
              </>
            ) : isMember ? (
              "Remove member"
            ) : (
              "Revoke invite"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
