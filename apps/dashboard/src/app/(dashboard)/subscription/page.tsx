"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Check,
  SpinnerGap,
  Sparkle,
  CreditCard,
  ArrowRight,
  CheckCircle,
  XCircle,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useToast } from "@/providers/toast-provider";

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
    features: [
      "300 memories",
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
    features: [
      "2,000 memories",
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
    features: [
      "10,000 memories",
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
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
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

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/api/user/profile"),
  });

  // Handle query params for success/error states
  useEffect(() => {
    if (hasShownToast.current) return;

    const success = searchParams.get("success");
    if (success === "true") {
      hasShownToast.current = true;
      setShowBanner("success");
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      // Clean up URL
      window.history.replaceState({}, "", "/subscription");
    }
  }, [searchParams, queryClient]);

  // Show banner for cancelled, on_hold, or failed status
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
      // Check if user has an ACTIVE Dodo subscription (not cancelled/expired)
      if (
        subscription?.dodoSubscriptionId &&
        subscription?.status === "active"
      ) {
        // Use change-plan API for existing subscribers
        const response = await api.post<{ success: boolean; message: string }>(
          "/api/subscription/change-plan",
          { plan: slug },
        );

        if (response.success) {
          toast.success("Plan change initiated! Updating your subscription...");
          // Poll for subscription update (webhook may take a moment)
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
        // Use checkout flow for new subscribers
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
        <p className="text-sm text-foreground-muted">
          Manage your plan and billing
        </p>
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

      {/* Current Plan Overview */}
      <Card className="shadow-none">
        <CardContent className="p-5">
          {subLoading ? (
            <div className="flex items-center justify-center py-8">
              <SpinnerGap
                className="h-5 w-5 animate-spin text-foreground-muted"
                weight="bold"
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                    <span className="text-sm font-medium text-accent capitalize">
                      {currentPlan} Plan
                    </span>
                  </div>
                  {subscription?.status && subscription.status !== "active" && (
                    <div
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        subscription.status === "cancelled"
                          ? "bg-warning/10 text-warning"
                          : "bg-error/10 text-error"
                      }`}
                    >
                      {subscription.status === "cancelled"
                        ? "Cancelling"
                        : subscription.status === "failed"
                          ? "Setup Failed"
                          : "On Hold"}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-foreground-muted" />
                    <span className="text-sm">
                      <span className="font-semibold">
                        {subscription?.memoryCount ?? 0}
                      </span>
                      <span className="text-foreground-muted">
                        {" "}
                        / {subscription?.memoryLimit ?? 100} memories
                      </span>
                    </span>
                  </div>
                  <div className="w-24 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Manage Billing Button - Only show for paid users */}
              {subscription?.dodoCustomerId && (
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="cursor-pointer"
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
          )}
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
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
              <Card
                key={plan.id}
                className={`shadow-none relative overflow-hidden ${
                  plan.popular ? "border-accent" : ""
                } ${isCurrent ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-accent text-accent-foreground text-xs font-medium rounded-bl-lg">
                    Popular
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="space-y-4">
                    {/* Plan Header */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs font-medium">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          ${plan.price}
                        </span>
                        <span className="text-foreground-muted">/month</span>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Check
                            className="h-4 w-4 text-accent shrink-0"
                            weight="bold"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <div className="pt-2">
                      {isCurrent ? (
                        <Button
                          variant="outline"
                          className="w-full cursor-default"
                          disabled
                        >
                          <Sparkle className="h-4 w-4 mr-2" weight="fill" />
                          Current Plan
                        </Button>
                      ) : plan.slug ? (
                        isOnHold ? (
                          <Button
                            variant="outline"
                            className="w-full cursor-default"
                            disabled
                          >
                            <Warning className="h-4 w-4 mr-2" />
                            Fix payment first
                          </Button>
                        ) : (
                          <Button
                            variant={isUpgrade ? "default" : "outline"}
                            className="w-full cursor-pointer"
                            onClick={() => handleUpgrade(plan.slug!)}
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
                                {isUpgrade ? "Upgrade" : "Switch"} to{" "}
                                {plan.name}
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
                          {isDowngrade
                            ? "Cancel subscription to downgrade"
                            : "Free Forever"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <Card className="shadow-none">
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">What happens when I upgrade?</h3>
              <p className="text-sm text-foreground-muted mt-1">
                Your new plan takes effect immediately. You&apos;ll be charged
                the prorated amount for the remainder of your billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-medium">Can I cancel anytime?</h3>
              <p className="text-sm text-foreground-muted mt-1">
                Yes! You can cancel your subscription at any time. You&apos;ll
                keep access to your current plan until the end of your billing
                period.
              </p>
            </div>
            <div>
              <h3 className="font-medium">
                What happens to my memories if I downgrade?
              </h3>
              <p className="text-sm text-foreground-muted mt-1">
                Your existing memories are preserved. However, you won&apos;t be
                able to add new memories if you exceed your new plan&apos;s
                limit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
