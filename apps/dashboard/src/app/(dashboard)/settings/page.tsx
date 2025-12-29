"use client";

import { useQuery } from "@tanstack/react-query";
import { User, Mail, CreditCard, LogOut, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
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

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-foreground-muted mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
                    <User className="h-6 w-6 text-foreground-muted" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {user?.name || "No name set"}
                    </div>
                    <div className="text-sm text-foreground-muted flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user?.email}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-foreground-muted">
                  <span className="font-medium">Account created:</span>{" "}
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Subscription Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>Your current plan and usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-lg border border-border bg-surface">
                    <div className="text-sm text-foreground-muted">
                      Current Plan
                    </div>
                    <div className="text-2xl font-bold mt-1 capitalize">
                      {subscription?.plan || "Free"}
                    </div>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-surface">
                    <div className="text-sm text-foreground-muted">
                      Memory Usage
                    </div>
                    <div className="text-2xl font-bold mt-1">
                      {subscription?.memoryCount ?? 0}
                      <span className="text-sm font-normal text-foreground-muted">
                        {" "}
                        / {subscription?.memoryLimit ?? 100}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{
                          width: `${Math.min(
                            ((subscription?.memoryCount ?? 0) /
                              (subscription?.memoryLimit ?? 100)) *
                              100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-sm text-foreground-muted">
                  {subscription?.plan === "free"
                    ? "Upgrade to Pro for unlimited memories and priority support."
                    : "Thank you for being a Pro subscriber!"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sign Out Section */}
        <Card className="border-red-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <LogOut className="h-5 w-5" />
              Sign Out
            </CardTitle>
            <CardDescription>
              Sign out of your account on this device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              disabled={isSigningOut}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
