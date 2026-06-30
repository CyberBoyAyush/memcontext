"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Check,
  SpinnerGap,
  CreditCard,
  ArrowRight,
  CheckCircle,
  XCircle,
  Warning,
  Lightning,
  RocketLaunch,
  Star,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";
import { ThemedSelect } from "@/components/ui/themed-select";
import { useWorkspace } from "@/providers/workspace-provider";

interface SubscriptionData {
  workspaceId: string;
  plan: string;
  memoryCount: number;
  memoryLimit: number;
  status: string;
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
}

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    memories: 300,
    memoryLabel: "300",
    icon: Star,
    features: [
      "300 memories",
      "1 workspace",
      "5 Context Vault documents",
      "Unlimited memory retrieval",
      "SDK and API access",
      "MCP integration",
      "Community support",
    ],
  },
  {
    id: "hobby",
    name: "Hobby",
    price: 20,
    memories: 2000,
    memoryLabel: "2K",
    slug: "hobby",
    icon: Lightning,
    features: [
      "2K memories",
      "5 workspaces",
      "25 Context Vault documents",
      "Unlimited memory retrieval",
      "SDK and API access",
      "MCP integration",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 50,
    memories: 10000,
    memoryLabel: "10K",
    slug: "pro",
    icon: RocketLaunch,
    features: [
      "10K memories",
      "10 workspaces",
      "100 Context Vault documents",
      "Unlimited memory retrieval",
      "SDK and API access",
      "MCP integration",
      "Priority support",
      "Early access to features",
    ],
    popular: true,
  },
  {
    id: "ultimate",
    name: "Ultimate",
    price: 100,
    memories: 100000,
    memoryLabel: "100K",
    slug: "ultimate",
    icon: RocketLaunch,
    features: [
      "100K memories",
      "50 workspaces",
      "500 Context Vault documents",
      "Unlimited memory retrieval",
      "SDK and API access",
      "MCP integration",
      "Priority support",
      "Early access to features",
      "Fair-use scaling for large knowledge bases",
    ],
  },
];

function StatusBanner({
  type,
  onDismiss,
  onAction,
  actionLoading,
}: {
  type: "success" | "cancelled" | "on_hold" | "failed";
  onDismiss: () => void;
  onAction?: () => void;
  actionLoading?: boolean;
}) {
  const config = {
    success: {
      icon: CheckCircle,
      bg: "bg-success/10 border-success/20",
      text: "text-success",
      title: "Payment successful!",
      message: "Your subscription has been activated. Thank you for upgrading!",
      dismissable: true,
    },
    cancelled: {
      icon: Warning,
      bg: "bg-warning/10 border-warning/20",
      text: "text-warning",
      title: "Subscription cancelled",
      message:
        "Your subscription is cancelled but you still have access until the end of your billing period.",
      dismissable: true,
    },
    on_hold: {
      icon: XCircle,
      bg: "bg-error/10 border-error/20",
      text: "text-error",
      title: "Payment failed - Action required",
      message:
        "Your subscription is on hold due to a payment issue. Please update your payment method to continue using your plan.",
      dismissable: false,
      actionLabel: "Update Payment Method",
    },
    failed: {
      icon: XCircle,
      bg: "bg-error/10 border-error/20",
      text: "text-error",
      title: "Subscription setup failed",
      message:
        "Your payment could not be processed. Please try again with a different payment method.",
      dismissable: true,
    },
  };

  const {
    icon: Icon,
    bg,
    text,
    title,
    message,
    dismissable,
    actionLabel,
  } = config[type] as (typeof config)[keyof typeof config] & {
    actionLabel?: string;
  };

  return (
    <div className={`rounded-lg border p-3 ${bg} animate-fade-in`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`h-4 w-4 ${text} shrink-0 mt-0.5`} weight="fill" />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${text}`}>{title}</h3>
          <p className="text-xs text-foreground-muted mt-0.5">{message}</p>
          {actionLabel && onAction && (
            <Button
              variant="default"
              size="sm"
              className="mt-2.5 cursor-pointer rounded-md"
              onClick={onAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <SpinnerGap
                    className="h-4 w-4 animate-spin mr-2"
                    weight="bold"
                  />
                  Loading...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {actionLabel}
                </>
              )}
            </Button>
          )}
        </div>
        {dismissable && (
          <button
            onClick={onDismiss}
            className="text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  isUpgrade,
  isOnHold,
  loadingPlan,
  canManageBilling,
  onUpgrade,
}: {
  plan: (typeof PLANS)[number];
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isOnHold: boolean;
  loadingPlan: string | null;
  canManageBilling: boolean;
  onUpgrade: (slug: string) => void;
}) {
  const isHighlighted = isCurrent;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col rounded-xl p-px transition-all duration-300",
        "bg-linear-to-b from-border-hover to-border",
      )}
    >
      <div className="relative flex flex-col flex-1 rounded-[11px] bg-surface overflow-hidden">
        {/* ── Hero Pricing Panel ── */}
        <div
          className={cn(
            "relative m-4 rounded-md p-5",
            isHighlighted
              ? "bg-linear-to-br from-[#c04020] via-accent to-[#e87850] text-white"
              : "bg-surface-elevated/60",
          )}
        >
          {/* Noise texture overlay for highlighted plan */}
          {isHighlighted && (
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />
          )}

          {/* Decorative shimmer line */}
          {isHighlighted && (
            <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/30 to-transparent" />
          )}

          {/* Plan name + badges */}
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "text-base font-semibold",
                  isHighlighted && "text-white",
                )}
              >
                {plan.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {plan.popular && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border",
                    isHighlighted
                      ? "bg-white/20 text-white border-white/10 backdrop-blur-sm"
                      : "bg-accent/10 border-accent/20 text-accent",
                  )}
                >
                  Popular
                </span>
              )}
              {isCurrent && !plan.popular && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-white/20 text-white border border-white/10 backdrop-blur-sm">
                  Current
                </span>
              )}
            </div>
          </div>

          {/* Price — big and bold */}
          <div className="relative flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-4xl font-extrabold tracking-tighter",
                isHighlighted ? "text-white" : "text-foreground",
              )}
            >
              ${plan.price}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                isHighlighted ? "text-white/60" : "text-foreground-muted",
              )}
            >
              /month
            </span>
          </div>
          <p
            className={cn(
              "text-xs mt-1.5",
              isHighlighted ? "text-white/50" : "text-foreground-subtle",
            )}
          >
            {plan.memoryLabel} memories included
          </p>

          {/* ── CTA inside hero ── */}
          <div className="relative mt-4">
            {isCurrent ? (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full cursor-default rounded-md",
                  isHighlighted &&
                    "border-border/60 bg-background/90 text-foreground hover:bg-background/90 hover:text-foreground",
                )}
                disabled
              >
                Current Plan
              </Button>
            ) : plan.slug ? (
              isOnHold ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full cursor-default rounded-md",
                    isHighlighted &&
                      "border-border/60 bg-background/90 text-foreground hover:bg-background/90 hover:text-foreground",
                  )}
                  disabled
                >
                  <Warning className="h-3.5 w-3.5 mr-1.5" />
                  Fix payment first
                </Button>
              ) : (
                <Button
                  variant={
                    isHighlighted
                      ? "secondary"
                      : isUpgrade
                        ? "default"
                        : "outline"
                  }
                  size="sm"
                  className={cn(
                    "w-full cursor-pointer rounded-md hover:translate-y-0 active:translate-y-0 shadow-none hover:shadow-none",
                    isHighlighted &&
                      "bg-background text-foreground border border-border/70 font-semibold hover:bg-background-secondary hover:text-foreground",
                  )}
                  onClick={() => plan.slug && onUpgrade(plan.slug)}
                  disabled={loadingPlan !== null || !canManageBilling}
                >
                  {loadingPlan === plan.slug ? (
                    <>
                      <SpinnerGap
                        className="h-3.5 w-3.5 animate-spin mr-1.5"
                        weight="bold"
                      />
                      Loading...
                    </>
                  ) : (
                    <>
                      {canManageBilling
                        ? `${isUpgrade ? "Upgrade" : "Switch"} to ${plan.name}`
                        : "Owner access required"}
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </>
                  )}
                </Button>
              )
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full cursor-default rounded-md"
                disabled
              >
                Free Forever
              </Button>
            )}
          </div>
        </div>

        {/* ── Feature Checklist (below hero) ── */}
        <div className="px-5 pb-5 pt-1 flex flex-col flex-1">
          <ul className="space-y-2.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0",
                    isHighlighted
                      ? "bg-accent/15 text-accent"
                      : "bg-surface-elevated border border-border text-foreground-muted",
                  )}
                >
                  <Check size={11} weight="bold" />
                </div>
                <span className="text-[13px] text-foreground/80">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const hasShownToast = useRef(false);

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showBanner, setShowBanner] = useState<
    "success" | "cancelled" | "on_hold" | "failed" | null
  >(null);

  const {
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspaceId,
    workspaces,
  } = useWorkspace();
  const canManageBilling = activeWorkspace?.role === "owner";

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription", activeWorkspaceId],
    queryFn: () =>
      api.get<SubscriptionData>(
        `/api/subscription/current?workspaceId=${activeWorkspaceId}`,
      ),
    enabled: !!activeWorkspaceId,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/api/user/profile"),
  });

  useEffect(() => {
    if (hasShownToast.current) return;

    const success = searchParams.get("success");
    if (success === "true") {
      hasShownToast.current = true;
      setShowBanner("success");
      queryClient.invalidateQueries({ queryKey: ["subscription", activeWorkspaceId] });
      window.history.replaceState({}, "", "/subscription");
    }
  }, [activeWorkspaceId, searchParams, queryClient]);

  useEffect(() => {
    if (subscription?.status === "cancelled") {
      setShowBanner("cancelled");
    } else if (subscription?.status === "on_hold") {
      setShowBanner("on_hold");
    } else if (subscription?.status === "failed") {
      setShowBanner("failed");
    }
  }, [subscription?.status]);

  const handleUpgrade = async (slug: string) => {
    if (!profile?.user) {
      toast.error("Please sign in to upgrade");
      return;
    }
    if (!activeWorkspaceId) {
      toast.error("Select a workspace to manage billing");
      return;
    }

    setLoadingPlan(slug);
    try {
      if (
        subscription?.dodoSubscriptionId &&
        subscription?.status === "active"
      ) {
        const response = await api.post<{ success: boolean; message: string }>(
          "/api/subscription/change-plan",
          { plan: slug, workspaceId: activeWorkspaceId },
        );

        if (response.success) {
          toast.success("Plan change initiated! Updating your subscription...");
          const originalPlan = subscription?.plan;
          let attempts = 0;
          const maxAttempts = 10;

          const pollForUpdate = async () => {
            attempts++;
            await queryClient.invalidateQueries({
              queryKey: ["subscription", activeWorkspaceId],
            });
            const newData = queryClient.getQueryData<SubscriptionData>([
              "subscription",
              activeWorkspaceId,
            ]);

            if (newData?.plan !== originalPlan) {
              toast.success(`Successfully switched to ${newData?.plan} plan!`);
              return;
            }

            if (attempts < maxAttempts) {
              setTimeout(pollForUpdate, 1500);
            }
          };

          setTimeout(pollForUpdate, 1500);
        }
      } else {
        const checkout = await api.post<{ url: string }>(
          "/api/subscription/checkout",
          { plan: slug, workspaceId: activeWorkspaceId },
        );
        window.location.href = checkout.url;
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      console.error("Upgrade error:", err);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    if (!canManageBilling) {
      toast.error("Only workspace owners can manage billing");
      return;
    }

    setPortalLoading(true);
    try {
      const portal = await api.post<{ url: string }>("/api/subscription/portal", {
        workspaceId: activeWorkspaceId,
      });

      window.open(portal.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = subscription?.plan || "free";
  const isOnHold = subscription?.status === "on_hold";
  const usagePercentage = Math.min(
    ((subscription?.memoryCount ?? 0) / (subscription?.memoryLimit ?? 300)) *
      100,
    100,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Manage your plan and billing
          </p>
        </div>
        {subscription?.dodoCustomerId && (
          <Button
            variant="outline"
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="cursor-pointer sm:w-auto w-full rounded-md"
          >
            {portalLoading ? (
              <>
                <SpinnerGap
                  className="h-4 w-4 animate-spin mr-2"
                  weight="bold"
                />
                Loading...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </>
            )}
          </Button>
        )}
      </div>

      <Card className="shadow-none rounded-lg">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Billing workspace</h2>
            <p className="mt-1 text-xs text-foreground-muted">
              This plan applies to the selected workspace memory pool.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:w-80">
            <ThemedSelect
              value={activeWorkspaceId}
              onChange={setActiveWorkspaceId}
              disabled={workspaces.length <= 1 || loadingPlan !== null}
              options={workspaces.map((workspace) => ({
                value: workspace.id,
                label: workspace.name,
              }))}
              className="w-full"
            />
            {!canManageBilling && activeWorkspace && (
              <p className="text-xs text-warning">
                Only workspace owners can change this workspace&apos;s billing.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Banner */}
      {showBanner && (
        <StatusBanner
          type={showBanner}
          onDismiss={() => setShowBanner(null)}
          onAction={showBanner === "on_hold" ? handleManageBilling : undefined}
          actionLoading={showBanner === "on_hold" ? portalLoading : undefined}
        />
      )}

      {/* Current Usage Card */}
      <Card className="shadow-none rounded-lg">
        <CardContent className="p-5">
          {subLoading ? (
            <div className="flex items-center justify-center py-7">
              <SpinnerGap
                className="h-4 w-4 animate-spin text-foreground-muted"
                weight="bold"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top row: Plan info + Status badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10">
                    <Brain
                      className="h-[18px] w-[18px] text-accent"
                      weight="duotone"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">
                      {PLANS.find((p) => p.id === currentPlan)?.name ?? "Free"}{" "}
                      Plan
                    </h3>
                    <p className="text-xs text-foreground-subtle mt-0.5">
                      {(subscription?.memoryLimit ?? 300).toLocaleString()}{" "}
                      memories included
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-md text-[11px] font-medium",
                    usagePercentage >= 90
                      ? "bg-error/10 text-error"
                      : usagePercentage >= 70
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      usagePercentage >= 90
                        ? "bg-error"
                        : usagePercentage >= 70
                          ? "bg-warning"
                          : "bg-success",
                    )}
                  />
                  {usagePercentage >= 90
                    ? "Near limit"
                    : usagePercentage >= 70
                      ? "Moderate"
                      : "Healthy"}
                </div>
              </div>

              {/* Usage stats + progress */}
              <div className="space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-foreground-muted">
                    Memory usage
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-semibold tabular-nums tracking-tight">
                      {subscription?.memoryCount ?? 0}
                    </span>
                    <span className="text-xs text-foreground-subtle">/</span>
                    <span className="text-xs text-foreground-muted tabular-nums">
                      {(subscription?.memoryLimit ?? 300).toLocaleString()}
                    </span>
                    <span className="ml-1 text-[11px] text-foreground-subtle tabular-nums">
                      ({Math.round(usagePercentage)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      usagePercentage >= 90
                        ? "bg-error"
                        : usagePercentage >= 70
                          ? "bg-warning"
                          : "bg-accent",
                    )}
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>

              {/* Subscription status (non-active only) */}
              {subscription?.status && subscription.status !== "active" && (
                <div className="flex items-center gap-2 pt-0.5">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium",
                      subscription.status === "cancelled"
                        ? "bg-warning/10 text-warning"
                        : "bg-error/10 text-error",
                    )}
                  >
                    {subscription.status === "cancelled" ? (
                      <Warning className="h-3 w-3" weight="fill" />
                    ) : (
                      <XCircle className="h-3 w-3" weight="fill" />
                    )}
                    {subscription.status === "cancelled"
                      ? "Cancelling at period end"
                      : subscription.status === "failed"
                        ? "Setup Failed"
                        : "On Hold — payment required"}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div>
        <h2 className="text-base font-semibold mb-4">Choose your plan</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan, index) => {
            const isCurrent = currentPlan === plan.id;
            const isUpgrade =
              !isCurrent &&
              PLANS.findIndex((p) => p.id === plan.id) >
                PLANS.findIndex((p) => p.id === currentPlan);
            const isDowngrade =
              !isCurrent &&
              PLANS.findIndex((p) => p.id === plan.id) <
                PLANS.findIndex((p) => p.id === currentPlan);

            return (
              <div
                key={plan.id}
                className="h-full animate-fade-in-up"
                style={{
                  animationDelay: `${index * 80}ms`,
                  animationFillMode: "backwards",
                }}
              >
                <PlanCard
                  plan={plan}
                  isCurrent={isCurrent}
                  isUpgrade={isUpgrade}
                  isDowngrade={isDowngrade}
                  isOnHold={isOnHold}
                  loadingPlan={loadingPlan}
                  canManageBilling={canManageBilling}
                  onUpgrade={handleUpgrade}
                />
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
