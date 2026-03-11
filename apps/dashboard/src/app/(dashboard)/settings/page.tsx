"use client";

import { useQuery } from "@tanstack/react-query";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
  User,
  SignOut,
  SpinnerGap,
  Brain,
  Envelope,
  CalendarBlank,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Warning,
  PaintBrush,
  Sun,
  Moon,
  Desktop,
  Check,
} from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: string;
  };
}

interface SubscriptionData {
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

interface ApiKeysData {
  keys: Array<{ id: string }>;
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: PhosphorIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-foreground-muted" weight="duotone" />
      </div>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-foreground-subtle">{description}</p>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 animate-pulse">
      <div className="w-20 h-20 rounded-full bg-surface-elevated border border-border shrink-0" />
      <div className="flex-1 space-y-3 text-center sm:text-left w-full">
        <div className="h-5 bg-surface-elevated rounded w-36 mx-auto sm:mx-0" />
        <div className="h-4 bg-surface-elevated rounded w-48 mx-auto sm:mx-0" />
        <div className="h-4 bg-surface-elevated rounded w-32 mx-auto sm:mx-0" />
      </div>
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-surface-elevated rounded w-28" />
        <div className="h-7 bg-surface-elevated rounded-full w-16" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 bg-surface-elevated rounded-xl" />
        <div className="h-28 bg-surface-elevated rounded-xl" />
      </div>
    </div>
  );
}

type ThemeValue = "light" | "system" | "dark";

interface ThemeOptionProps {
  value: ThemeValue;
  label: string;
  icon: typeof Sun;
  active: boolean;
  onSelect: (value: string) => void;
  children: React.ReactNode;
}

function ThemeOption({
  value,
  label,
  icon: Icon,
  active,
  onSelect,
  children,
}: ThemeOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${label} theme`}
      onClick={() => onSelect(value)}
      className={cn(
        "group relative flex flex-col rounded-xl border-2 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-accent bg-accent/[0.04]"
          : "border-border hover:border-border-hover bg-surface",
      )}
    >
      {/* Preview thumbnail */}
      <div className="relative overflow-hidden rounded-t-[10px]">
        {children}
        {/* Selected overlay checkmark */}
        {active && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-sm">
            <Check className="h-3 w-3 text-accent-foreground" weight="bold" />
          </div>
        )}
      </div>

      {/* Label row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            active ? "text-accent" : "text-foreground-subtle",
          )}
          weight={active ? "fill" : "duotone"}
        />
        <span
          className={cn(
            "text-xs font-medium transition-colors",
            active ? "text-foreground" : "text-foreground-muted",
          )}
        >
          {label}
        </span>
      </div>
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/api/user/profile"),
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
  });

  const { data: apiKeys } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get<ApiKeysData>("/api/api-keys"),
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch {
      setIsSigningOut(false);
    }
  };

  const user = profile?.user;
  const usagePercentage = Math.min(
    ((subscription?.memoryCount ?? 0) / (subscription?.memoryLimit ?? 100)) *
      100,
    100,
  );
  const isFreePlan = !subscription?.plan || subscription.plan === "free";
  const keyCount = apiKeys?.keys?.length ?? 0;

  return (
    <div className="space-y-8 animate-fade-in ">
      {/* Page Header */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "0ms", animationFillMode: "backwards" }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Manage your account, subscription, and preferences
        </p>
      </div>

      {/* Profile Section */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "60ms", animationFillMode: "backwards" }}
      >
        <SectionHeader
          icon={User}
          title="Profile"
          description="Your account information"
        />
        <Card className="shadow-none">
          <CardContent className="p-6">
            {profileLoading ? (
              <ProfileSkeleton />
            ) : (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full bg-surface-elevated border border-border overflow-hidden flex items-center justify-center">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || "User"}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User
                        className="h-10 w-10 text-foreground-muted"
                        weight="duotone"
                      />
                    )}
                  </div>
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-surface" />
                </div>

                {/* User Details */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h2 className="text-lg font-semibold truncate">
                    {user?.name || "No name set"}
                  </h2>

                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-foreground-muted">
                      <Envelope
                        className="h-3.5 w-3.5 shrink-0"
                        weight="duotone"
                      />
                      <span className="truncate">{user?.email}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-foreground-subtle">
                      <CalendarBlank
                        className="h-3.5 w-3.5 shrink-0"
                        weight="duotone"
                      />
                      <span>
                        Joined{" "}
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Section */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "120ms", animationFillMode: "backwards" }}
      >
        <SectionHeader
          icon={CreditCard}
          title="Subscription"
          description="Your plan and usage details"
        />
        <Card className="shadow-none">
          <CardContent className="p-6">
            {subLoading ? (
              <SubscriptionSkeleton />
            ) : (
              <div className="space-y-5">
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "px-3 py-1 rounded-full border",
                        isFreePlan
                          ? "bg-surface-elevated border-border"
                          : "bg-accent/10 border-accent/20",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium capitalize",
                          isFreePlan ? "text-foreground-muted" : "text-accent",
                        )}
                      >
                        {subscription?.plan || "Free"} Plan
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/subscription"
                    className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    Manage
                    <ArrowRight className="h-3 w-3" weight="bold" />
                  </Link>
                </div>

                {/* Usage Stats */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Memory Usage */}
                  <div className="p-4 rounded-xl bg-surface-elevated border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain
                          className="h-4 w-4 text-accent"
                          weight="duotone"
                        />
                        <span className="text-sm font-medium">
                          Memory Usage
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          usagePercentage >= 90
                            ? "text-error"
                            : usagePercentage >= 70
                              ? "text-warning"
                              : "text-foreground-muted",
                        )}
                      >
                        {usagePercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {subscription?.memoryCount ?? 0}
                      <span className="text-sm font-normal text-foreground-muted">
                        {" "}
                        / {subscription?.memoryLimit ?? 100}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
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

                  {/* Quick Stats */}
                  <div className="p-4 rounded-xl bg-surface-elevated border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck
                        className="h-4 w-4 text-foreground-muted"
                        weight="duotone"
                      />
                      <span className="text-sm font-medium">API Keys</span>
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {keyCount}
                      <span className="text-sm font-normal text-foreground-muted">
                        {" "}
                        active {keyCount === 1 ? "key" : "keys"}
                      </span>
                    </div>
                    <Link
                      href="/api-keys"
                      className="mt-2 text-xs text-foreground-subtle hover:text-foreground-muted flex items-center gap-1 transition-colors"
                    >
                      Manage API keys
                      <ArrowRight className="h-3 w-3" weight="bold" />
                    </Link>
                  </div>
                </div>

                {/* Upgrade CTA for free users */}
                {isFreePlan && (
                  <Link
                    href="/subscription"
                    className="group flex items-center justify-between p-3.5 rounded-xl border border-accent/15 bg-accent/[0.04] hover:bg-accent/[0.08] hover:border-accent/25 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <ArrowRight
                          className="h-4 w-4 text-accent"
                          weight="bold"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Upgrade your plan</p>
                        <p className="text-xs text-foreground-muted">
                          Get more memories and unlimited retrieval
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-foreground-muted group-hover:text-foreground shrink-0 ml-3 transition-colors"
                      weight="bold"
                    />
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appearance Section */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "180ms", animationFillMode: "backwards" }}
      >
        <SectionHeader
          icon={PaintBrush}
          title="Appearance"
          description="Customize how the dashboard looks"
        />
        <Card className="shadow-none">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Color mode</h3>
                <p className="text-xs text-foreground-subtle mt-0.5">
                  Choose between light and dark themes, or follow your system
                  preference
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Color mode"
                className="grid grid-cols-3 gap-3"
              >
                {/* Light */}
                <ThemeOption
                  value="light"
                  label="Light"
                  icon={Sun}
                  active={mounted && theme === "light"}
                  onSelect={setTheme}
                >
                  <Image
                    src="https://res.cloudinary.com/dyetf2h9n/image/upload/v1773176134/light_paswwv.png"
                    alt="Light theme preview"
                    width={400}
                    height={260}
                    className="w-full h-auto object-cover object-top-left"
                    draggable={false}
                  />
                </ThemeOption>

                {/* Auto / System */}
                <ThemeOption
                  value="system"
                  label="Auto"
                  icon={Desktop}
                  active={mounted && theme === "system"}
                  onSelect={setTheme}
                >
                  <div className="relative w-full overflow-hidden">
                    {/* Light screenshot — clipped to left half */}
                    <Image
                      src="https://res.cloudinary.com/dyetf2h9n/image/upload/v1773176134/light_paswwv.png"
                      alt=""
                      width={400}
                      height={260}
                      className="w-full h-auto object-cover object-top-left"
                      style={{ clipPath: "inset(0 50% 0 0)" }}
                      aria-hidden="true"
                      draggable={false}
                    />
                    {/* Dark screenshot — clipped to right half, layered on top */}
                    <Image
                      src="https://res.cloudinary.com/dyetf2h9n/image/upload/v1773176135/dark_rjay24.png"
                      alt=""
                      width={400}
                      height={260}
                      className="absolute inset-0 w-full h-full object-cover object-top-left"
                      style={{ clipPath: "inset(0 0 0 50%)" }}
                      aria-hidden="true"
                      draggable={false}
                    />
                    {/* Center divider */}
                    {/* <div className="absolute inset-y-0 left-1/2 w-px bg-border-hover -translate-x-1/2 z-10" /> */}
                  </div>
                </ThemeOption>

                {/* Dark */}
                <ThemeOption
                  value="dark"
                  label="Dark"
                  icon={Moon}
                  active={mounted && theme === "dark"}
                  onSelect={setTheme}
                >
                  <Image
                    src="https://res.cloudinary.com/dyetf2h9n/image/upload/v1773176135/dark_rjay24.png"
                    alt="Dark theme preview"
                    width={400}
                    height={260}
                    className="w-full h-auto object-cover object-top-left"
                    draggable={false}
                  />
                </ThemeOption>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <div
        className="animate-fade-in-up"
        style={{ animationDelay: "240ms", animationFillMode: "backwards" }}
      >
        <SectionHeader
          icon={Warning}
          title="Danger Zone"
          description="Irreversible account actions"
        />
        <Card className="shadow-none border-error/15">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-sm">Sign Out</h3>
                <p className="text-sm text-foreground-muted mt-0.5">
                  Sign out of your account on this device
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="sm:w-auto w-full cursor-pointer hover:translate-y-0 hover:shadow-none"
              >
                {isSigningOut ? (
                  <>
                    <SpinnerGap
                      className="h-4 w-4 animate-spin mr-2"
                      weight="bold"
                    />
                    Signing out...
                  </>
                ) : (
                  <>
                    <SignOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
