"use client";

import { useQuery } from "@tanstack/react-query";
import {
  User,
  Mail,
  Calendar,
  LogOut,
  Loader2,
  Sparkles,
  Brain,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

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

export default function SettingsPage() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/api/user/profile"),
  });

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-foreground-muted mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card - Premium Design */}
      <div className="relative">
        {/* Border glow */}
        <div
          className="absolute -top-px -left-px w-32 h-24 rounded-2xl blur-[1px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 30%, transparent 60%)",
          }}
        />
        <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none" />

          <div className="relative p-6">
            {profileLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
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
                      <User className="h-10 w-10 text-foreground-muted" />
                    )}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-surface" />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold truncate">
                    {user?.name || "No name set"}
                  </h2>
                  <div className="flex items-center gap-2 text-foreground-muted mt-1">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-subtle mt-2">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span className="text-sm">
                      Joined{" "}
                      {user?.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Card - Premium Design */}
      <div className="relative">
        {/* Border glow */}
        <div
          className="absolute -top-px -left-px w-32 h-24 rounded-2xl blur-[1px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(232,97,60,0.3) 0%, rgba(232,97,60,0.1) 30%, transparent 60%)",
          }}
        />
        <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-transparent pointer-events-none" />

          <div className="relative p-6">
            {subLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Plan Badge and Title */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Current Plan</h3>
                      <p className="text-sm text-foreground-muted">
                        Your subscription details
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                    <span className="text-sm font-medium text-accent capitalize">
                      {subscription?.plan || "Free"}
                    </span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Memory Usage Card */}
                  <div className="relative p-4 rounded-xl bg-surface-elevated/50 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-accent" />
                        <span className="text-sm font-medium">
                          Memory Usage
                        </span>
                      </div>
                      <span className="text-xs text-foreground-muted">
                        {usagePercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {subscription?.memoryCount ?? 0}
                      <span className="text-sm font-normal text-foreground-muted">
                        {" "}
                        / {subscription?.memoryLimit ?? 100}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 h-2 rounded-full bg-background overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500"
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Memory Limit Card */}
                  <div className="relative p-4 rounded-xl bg-surface-elevated/50 border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">Memory Limit</span>
                    </div>
                    <div className="text-2xl font-bold">
                      {subscription?.memoryLimit ?? 100}
                      <span className="text-sm font-normal text-foreground-muted">
                        {" "}
                        memories
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-foreground-subtle">
                      Maximum memories for your plan
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="relative rounded-2xl border border-error/20 bg-surface overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                <LogOut className="h-5 w-5 text-error" />
              </div>
              <div>
                <h3 className="font-semibold">Sign Out</h3>
                <p className="text-sm text-foreground-muted">
                  Sign out of your account on this device
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="sm:w-auto w-full"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
