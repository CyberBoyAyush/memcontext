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
  CaretDown,
  Question,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/providers/toast-provider";
import { cn } from "@/lib/utils";

interface SubscriptionData {
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
    icon: Star,
    features: [
      "300 memories",
      "Limited memory retrieval",
      "Unlimited projects",
      "MCP integration",
      "Community support",
    ],
  },
  {
    id: "hobby",
    name: "Hobby",
    price: 5,
    memories: 2000,
    slug: "hobby",
    icon: Lightning,
    features: [
      "2,000 memories",
      "Unlimited memory retrieval",
      "Unlimited projects",
      "MCP integration",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    memories: 10000,
    slug: "pro",
    icon: RocketLaunch,
    features: [
      "10,000 memories",
      "Unlimited memory retrieval",
      "Unlimited projects",
      "MCP integration",
      "Priority support",
      "Early access to features",
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
    <div className={`rounded-xl border p-4 ${bg} animate-fade-in`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${text} shrink-0 mt-0.5`} weight="fill" />
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${text}`}>{title}</h3>
          <p className="text-sm text-foreground-muted mt-0.5">{message}</p>
          {actionLabel && onAction && (
            <Button
              variant="default"
              size="sm"
              className="mt-3 cursor-pointer"
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
  onUpgrade,
}: {
  plan: (typeof PLANS)[number];
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isOnHold: boolean;
  loadingPlan: string | null;
  onUpgrade: (slug: string) => void;
}) {
  const isHighlighted = isCurrent;

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col rounded-2xl p-px transition-all duration-300",
        "bg-linear-to-b from-border-hover to-border",
        isCurrent &&
          "ring-2 ring-accent/30 ring-offset-2 ring-offset-background",
      )}
    >
      {/* Outer aura glow — visible around the card edge */}
      {isHighlighted && (
        <div
          className="pointer-events-none absolute -inset-3 rounded-3xl opacity-60 blur-xl transition-opacity duration-500 group-hover:opacity-80"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, var(--accent-glow) 0%, transparent 70%)",
          }}
        />
      )}

      <div className="relative flex flex-col flex-1 rounded-[14px] bg-surface overflow-hidden">
        {/* ── Hero Pricing Panel ── */}
        <div
          className={cn(
            "relative m-4 rounded-lg p-6 pb-6",
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
          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              {/* <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center",
                  plan.popular
                    ? "bg-white/15 text-white"
                    : "bg-surface-elevated border border-border text-foreground-muted",
                )}
              >
                <PlanIcon size={18} weight="duotone" />
              </div> */}
              <h3
                className={cn(
                  "text-lg font-semibold",
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
                    "px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide border",
                    isHighlighted
                      ? "bg-white/20 text-white border-white/10 backdrop-blur-sm"
                      : "bg-accent/10 border-accent/20 text-accent",
                  )}
                >
                  Popular
                </span>
              )}
              {isCurrent && !plan.popular && (
                <span
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wide bg-white/20 text-white border border-white/10 backdrop-blur-sm"
                >
                  Current
                </span>
              )}
            </div>
          </div>

          {/* Price — big and bold */}
          <div className="relative flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-5xl font-extrabold tracking-tighter",
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
              "text-xs mt-2",
              isHighlighted ? "text-white/50" : "text-foreground-subtle",
            )}
          >
            {plan.memories.toLocaleString()} memories included
          </p>

          {/* ── CTA inside hero ── */}
          <div className="relative mt-5">
            {isCurrent ? (
              <Button
                variant="outline"
                className={cn(
                  "w-full cursor-default",
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
                  className={cn(
                    "w-full cursor-default",
                    isHighlighted &&
                      "border-border/60 bg-background/90 text-foreground hover:bg-background/90 hover:text-foreground",
                  )}
                  disabled
                >
                  <Warning className="h-4 w-4 mr-2" />
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
                  className={cn(
                    "w-full cursor-pointer hover:translate-y-0 active:translate-y-0",
                    isHighlighted &&
                      "bg-background text-foreground border border-border/70 font-semibold shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:bg-background-secondary hover:text-foreground hover:shadow-[0_6px_28px_rgba(0,0,0,0.3)]",
                    !isHighlighted &&
                      isUpgrade &&
                      "shadow-[0_2px_12px_var(--accent-glow)]",
                  )}
                  onClick={() => plan.slug && onUpgrade(plan.slug)}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.slug ? (
                    <>
                      <SpinnerGap
                        className="h-4 w-4 animate-spin mr-2"
                        weight="bold"
                      />
                      Loading...
                    </>
                  ) : (
                    <>
                      {isUpgrade ? "Upgrade" : "Switch"} to {plan.name}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )
            ) : (
              <Button
                variant="outline"
                className="w-full cursor-default"
                disabled
              >
                Free Forever
              </Button>
            )}
          </div>
        </div>

        {/* ── Feature Checklist (below hero) ── */}
        <div className="p-6 pt-5 flex flex-col flex-1">
          <ul className="space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0",
                    isHighlighted
                      ? "bg-accent/15 text-accent"
                      : "bg-surface-elevated border border-border text-foreground-muted",
                  )}
                >
                  <Check size={12} weight="bold" />
                </div>
                <span className="text-sm text-foreground/80">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: "What happens when I upgrade?",
    answer:
      "Your new plan takes effect immediately. You'll be charged the prorated amount for the remainder of your billing cycle.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes! You can cancel your subscription at any time. You'll keep access to your current plan until the end of your billing period.",
  },
  {
    question: "What happens to my memories if I downgrade?",
    answer:
      "Your existing memories are preserved. However, you won't be able to add new memories if you exceed your new plan's limit.",
  },
];

function FaqItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: (typeof FAQ_ITEMS)[number];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "group rounded-xl border transition-all duration-200",
        isOpen
          ? "border-border-hover bg-surface-elevated/50"
          : "border-border bg-transparent hover:border-border-hover/60",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left cursor-pointer"
      >
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold transition-colors duration-200",
            isOpen
              ? "bg-accent/15 text-accent"
              : "bg-surface-elevated text-foreground-subtle",
          )}
        >
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-foreground">
          {item.question}
        </span>
        <CaretDown
          className={cn(
            "h-4 w-4 shrink-0 text-foreground-subtle transition-transform duration-200",
            isOpen && "rotate-180 text-foreground-muted",
          )}
          weight="bold"
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 pl-14 text-sm leading-relaxed text-foreground-muted">
            {item.answer}
          </p>
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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
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
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      window.history.replaceState({}, "", "/subscription");
    }
  }, [searchParams, queryClient]);

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

    setLoadingPlan(slug);
    try {
      if (
        subscription?.dodoSubscriptionId &&
        subscription?.status === "active"
      ) {
        const response = await api.post<{ success: boolean; message: string }>(
          "/api/subscription/change-plan",
          { plan: slug },
        );

        if (response.success) {
          toast.success("Plan change initiated! Updating your subscription...");
          const originalPlan = subscription?.plan;
          let attempts = 0;
          const maxAttempts = 10;

          const pollForUpdate = async () => {
            attempts++;
            await queryClient.invalidateQueries({ queryKey: ["subscription"] });
            const newData = queryClient.getQueryData<SubscriptionData>([
              "subscription",
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
        const { data, error } = await authClient.dodopayments.checkoutSession({
          slug,
          customer: {
            email: profile.user.email,
            name: profile.user.name || "",
          },
        });

        if (error) {
          toast.error("Failed to create checkout session");
          console.error("Checkout error:", error);
          return;
        }

        if (data?.url) {
          window.location.href = data.url;
        }
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
    setPortalLoading(true);
    try {
      const { data, error } = await authClient.dodopayments.customer.portal();

      if (error) {
        toast.error("Failed to open billing portal");
        console.error("Portal error:", error);
        return;
      }

      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = subscription?.plan || "free";
  const isOnHold = subscription?.status === "on_hold";
  const usagePercentage = Math.min(
    ((subscription?.memoryCount ?? 0) / (subscription?.memoryLimit ?? 100)) *
      100,
    100,
  );

  return (
    <div className="space-y-8 animate-fade-in">
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
            className="cursor-pointer sm:w-auto w-full"
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
      <Card className="shadow-none">
        <CardContent className="p-6">
          {subLoading ? (
            <div className="flex items-center justify-center py-8">
              <SpinnerGap
                className="h-5 w-5 animate-spin text-foreground-muted"
                weight="bold"
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top row: Plan info + Status badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
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
                      {(subscription?.memoryLimit ?? 100).toLocaleString()}{" "}
                      memories included
                    </p>
                  </div>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-lg text-xs font-medium",
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

              {/* Divider */}
              {/* <div className="h-px bg-border" /> */}

              {/* Usage stats + progress */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-foreground-muted">
                    Memory usage
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold tabular-nums tracking-tight">
                      {subscription?.memoryCount ?? 0}
                    </span>
                    <span className="text-sm text-foreground-subtle">/</span>
                    <span className="text-sm text-foreground-muted tabular-nums">
                      {(subscription?.memoryLimit ?? 100).toLocaleString()}
                    </span>
                    <span className="ml-1.5 text-xs text-foreground-subtle tabular-nums">
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
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
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
        <h2 className="text-lg font-semibold mb-5">Choose your plan</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                  onUpgrade={handleUpgrade}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <div>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Question className="h-4 w-4 text-accent" weight="duotone" />
          </div>
          <h2 className="text-lg font-semibold">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, index) => (
            <FaqItem
              key={index}
              item={item}
              index={index}
              isOpen={openFaq === index}
              onToggle={() => setOpenFaq(openFaq === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
