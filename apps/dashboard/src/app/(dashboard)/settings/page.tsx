"use client";

import { useQuery } from "@tanstack/react-query";
import { User, SignOut, SpinnerGap, Brain } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-foreground-muted">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card className="shadow-none">
        <CardContent className="p-6">
          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <SpinnerGap
                className="h-5 w-5 animate-spin text-foreground-muted"
                weight="bold"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative">
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
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-success border-2 border-surface" />
              </div>

              {/* User Info */}
              <h2 className="text-lg font-semibold mt-4">
                {user?.name || "No name set"}
              </h2>
              <p className="text-sm text-foreground-muted mt-1">
                {user?.email}
              </p>
              <p className="text-sm text-foreground-subtle mt-1">
                Joined{" "}
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Unknown"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Section */}
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
            <div className="space-y-5">
              {/* Plan Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Current Plan</h3>
                  <p className="text-sm text-foreground-muted">
                    Your subscription details
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                  <span className="text-sm font-medium text-accent capitalize">
                    {subscription?.plan || "Free"}
                  </span>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Memory Usage */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium">Memory Usage</span>
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
                  <div className="mt-3 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>

                {/* Memory Limit */}
                <div className="p-4 rounded-xl bg-surface-elevated border border-border">
                  <div className="flex items-center gap-2 mb-2">
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
        </CardContent>
      </Card>

      {/* Sign Out Section */}
      <Card className="shadow-none">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-semibold">Sign Out</h3>
              <p className="text-sm text-foreground-muted">
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
  );
}
