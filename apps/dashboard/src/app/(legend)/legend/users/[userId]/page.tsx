"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Brain,
  Key,
  Calendar,
  Envelope,
  CheckCircle,
  XCircle,
  CaretLeft,
  SpinnerGap,
  CaretDown,
  Check,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  adminUserDetailsQueryOptions,
  useUpdateUserPlan,
  type PlanType,
} from "@/lib/queries/admin";
import { formatDateTime, cn } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

const plans: { value: PlanType; label: string; limit: number }[] = [
  { value: "free", label: "Free", limit: 300 },
  { value: "hobby", label: "Hobby", limit: 2000 },
  { value: "pro", label: "Pro", limit: 10000 },
];

const planColors: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  hobby: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pro: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

function PlanSelect({
  value,
  onChange,
  disabled,
}: {
  value: PlanType;
  onChange: (value: PlanType) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedPlan = plans.find((p) => p.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-2 text-sm transition-colors",
          "focus:outline-none hover:bg-surface-elevated",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
              planColors[value] || planColors.free,
            )}
          >
            {selectedPlan?.label}
          </span>
          <span className="text-foreground-muted text-xs">
            ({selectedPlan?.limit.toLocaleString()} memories)
          </span>
        </span>
        <CaretDown
          className={cn(
            "h-4 w-4 text-foreground-muted transition-transform",
            open && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-full bg-background border border-border rounded-xl shadow-lg py-1 animate-scale-in">
            {plans.map((plan) => (
              <button
                key={plan.value}
                className={cn(
                  "w-full px-4 py-2.5 text-sm text-left hover:bg-surface flex items-center justify-between gap-2 transition-colors",
                  value === plan.value && "bg-surface",
                )}
                onClick={() => {
                  onChange(plan.value);
                  setOpen(false);
                }}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
                      planColors[plan.value],
                    )}
                  >
                    {plan.label}
                  </span>
                  <span className="text-foreground-muted text-xs">
                    {plan.limit.toLocaleString()} memories
                  </span>
                </span>
                {value === plan.value && (
                  <Check className="h-4 w-4 text-accent" weight="bold" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ConfirmDialog({
  currentPlan,
  newPlan,
  userName,
  onClose,
  onConfirm,
  isLoading,
}: {
  currentPlan: string;
  newPlan: PlanType;
  userName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const newPlanInfo = plans.find((p) => p.value === newPlan);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />

      <div className="relative w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl animate-scale-in">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-amber-500/10">
            <Warning className="h-6 w-6 text-amber-500" weight="duotone" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Confirm Plan Change</h3>
            <p className="text-sm text-foreground-muted">
              You are about to change the plan for{" "}
              <span className="font-medium text-foreground">{userName}</span>
            </p>
          </div>

          <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Current Plan:</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
                  planColors[currentPlan] || planColors.free,
                )}
              >
                {currentPlan}
              </span>
            </div>
            <div className="flex items-center justify-center">
              <svg
                className="h-4 w-4 text-foreground-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">New Plan:</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
                  planColors[newPlan],
                )}
              >
                {newPlanInfo?.label}
              </span>
            </div>
            <div className="pt-2 border-t border-border text-xs text-foreground-muted text-center">
              New memory limit: {newPlanInfo?.limit.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 border-t border-border bg-surface/50 rounded-b-2xl">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <SpinnerGap
                  className="h-4 w-4 animate-spin mr-2"
                  weight="bold"
                />
                Updating...
              </>
            ) : (
              "Confirm Change"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const toast = useToast();
  const userId = params.userId as string;

  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    data: user,
    isLoading,
    error,
  } = useQuery(adminUserDetailsQueryOptions(userId));

  const updatePlanMutation = useUpdateUserPlan();

  const currentPlan = (user?.plan || "free") as PlanType;
  const hasChanges = selectedPlan !== null && selectedPlan !== currentPlan;

  function handleSave() {
    if (!selectedPlan || selectedPlan === currentPlan) return;
    setShowConfirm(true);
  }

  async function handleConfirm() {
    if (!selectedPlan || !user) return;

    try {
      await updatePlanMutation.mutateAsync({ userId, plan: selectedPlan });
      toast.success(`Plan updated to ${selectedPlan}`);
      setShowConfirm(false);
      setSelectedPlan(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update plan");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-lg bg-surface-elevated" />
          <div className="h-6 w-48 rounded-lg bg-surface-elevated" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 rounded-xl bg-surface-elevated" />
          <div className="h-64 rounded-xl bg-surface-elevated" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <Link href="/legend/users">
          <Button variant="ghost" size="sm" className="gap-2">
            <CaretLeft className="h-4 w-4" weight="bold" />
            Back to Users
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-error mb-2">User not found</div>
            <p className="text-sm text-foreground-muted">
              The user you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/legend/users">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <CaretLeft className="h-4 w-4" weight="bold" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold tracking-tight">User Details</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-surface-elevated border border-border overflow-hidden flex items-center justify-center shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User
                    className="h-8 w-8 text-foreground-muted"
                    weight="duotone"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold truncate">
                    {user.name}
                  </h2>
                  {user.role === "admin" && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground-muted truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Envelope className="h-4 w-4" weight="duotone" />
                  Email Verified
                </div>
                <div className="flex items-center gap-1.5">
                  {user.emailVerified ? (
                    <>
                      <CheckCircle
                        className="h-4 w-4 text-green-500"
                        weight="fill"
                      />
                      <span className="text-sm text-green-500">Yes</span>
                    </>
                  ) : (
                    <>
                      <XCircle
                        className="h-4 w-4 text-foreground-muted"
                        weight="fill"
                      />
                      <span className="text-sm text-foreground-muted">No</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Calendar className="h-4 w-4" weight="duotone" />
                  Joined
                </div>
                <div className="text-sm">
                  {formatDateTime(user.createdAt).date}
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Key className="h-4 w-4" weight="duotone" />
                  API Keys
                </div>
                <div className="text-sm font-medium">{user.apiKeyCount}</div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-sm text-foreground-muted">
                  <Brain className="h-4 w-4" weight="duotone" />
                  Memories
                </div>
                <div className="text-sm">
                  <span className="font-medium">{user.memoryCount}</span>
                  <span className="text-foreground-muted">
                    {" "}
                    / {user.memoryLimit}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Management Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Subscription Plan</h3>
              <p className="text-sm text-foreground-muted">
                Manage the user&apos;s subscription plan and limits
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground-muted">
                  Current Plan
                </label>
                <PlanSelect
                  value={selectedPlan || currentPlan}
                  onChange={setSelectedPlan}
                  disabled={updatePlanMutation.isPending}
                />
              </div>

              {hasChanges && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-500">
                  Plan will be changed from{" "}
                  <span className="font-medium capitalize">{currentPlan}</span>{" "}
                  to{" "}
                  <span className="font-medium capitalize">{selectedPlan}</span>
                </div>
              )}

              <div className="flex gap-3">
                {hasChanges && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSelectedPlan(null)}
                    disabled={updatePlanMutation.isPending}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  className={hasChanges ? "flex-1" : "w-full"}
                  onClick={handleSave}
                  disabled={!hasChanges || updatePlanMutation.isPending}
                >
                  {updatePlanMutation.isPending ? (
                    <>
                      <SpinnerGap
                        className="h-4 w-4 animate-spin mr-2"
                        weight="bold"
                      />
                      Updating...
                    </>
                  ) : (
                    "Update Plan"
                  )}
                </Button>
              </div>
            </div>

            {/* Plan Benefits Info */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-3">Plan Limits</h4>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div
                    key={plan.value}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-lg",
                      (selectedPlan || currentPlan) === plan.value
                        ? "bg-surface-elevated"
                        : "",
                    )}
                  >
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize border",
                        planColors[plan.value],
                      )}
                    >
                      {plan.label}
                    </span>
                    <span className="text-sm text-foreground-muted">
                      {plan.limit.toLocaleString()} memories
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      {showConfirm && selectedPlan && (
        <ConfirmDialog
          currentPlan={currentPlan}
          newPlan={selectedPlan}
          userName={user.name}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          isLoading={updatePlanMutation.isPending}
        />
      )}
    </div>
  );
}
