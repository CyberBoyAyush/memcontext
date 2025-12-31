"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  Key,
  ChartLineUp,
  Sparkle,
  ArrowRight,
  Tag,
  FolderOpen,
  Clock,
  Lightbulb,
  CheckSquare,
  ChatCircle,
  FileText,
  Globe,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SubscriptionData {
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

interface ApiKeysData {
  keys: Array<{ id: string; name: string; lastUsedAt: string | null }>;
}

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface DashboardStats {
  categories: {
    preference: number;
    fact: number;
    decision: number;
    context: number;
    uncategorized: number;
  };
  projects: Array<{ name: string; count: number }>;
  recentMemories: Array<{
    id: string;
    content: string;
    category: string | null;
    project: string;
    createdAt: string;
  }>;
}

const categoryConfig: Record<
  string,
  { color: string; bg: string; icon: typeof Lightbulb }
> = {
  preference: { color: "text-accent", bg: "bg-accent/10", icon: Lightbulb },
  fact: { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: FileText },
  decision: {
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    icon: CheckSquare,
  },
  context: { color: "text-amber-400", bg: "bg-amber-500/10", icon: ChatCircle },
};

export default function DashboardPage() {
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get<ApiKeysData>("/api/api-keys"),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<UserProfile>("/api/user/profile"),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStats>("/api/user/dashboard-stats"),
  });

  const usagePercentage = Math.min(
    ((subscription?.memoryCount ?? 0) / (subscription?.memoryLimit ?? 100)) *
      100,
    100,
  );

  const userName = profile?.user?.name?.split(" ")[0] || "there";
  const hasMemories = (subscription?.memoryCount ?? 0) > 0;

  // Calculate total categorized memories
  const totalCategorized = stats
    ? Object.values(stats.categories).reduce((a, b) => a + b, 0) -
      stats.categories.uncategorized
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {userName}
            </h1>
            <p className="text-foreground-muted mt-1">
              Here&apos;s what&apos;s happening with your memories
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-2">
              <Sparkle className="h-3.5 w-3.5 text-accent" weight="fill" />
              <span className="text-sm font-medium text-accent capitalize">
                {subscription?.plan || "Free"} Plan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - All equal height */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Memory Usage Card */}
        <Link href="/memories" className="group">
          <div className="relative h-full">
            <div
              className="absolute -top-px -left-px w-20 h-14 rounded-2xl blur-[1px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(232,97,60,0.4) 0%, rgba(232,97,60,0.1) 30%, transparent 60%)",
              }}
            />
            <div className="relative h-full rounded-2xl border border-border bg-surface overflow-hidden group-hover:border-accent/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-transparent pointer-events-none" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Brain
                      className="h-4.5 w-4.5 text-accent"
                      weight="duotone"
                    />
                  </div>
                  <span className="text-xs text-foreground-muted">
                    {usagePercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {subLoading ? "..." : (subscription?.memoryCount ?? 0)}
                  <span className="text-sm font-normal text-foreground-muted">
                    {" "}
                    / {subscription?.memoryLimit ?? 100}
                  </span>
                </div>
                <p className="text-sm text-foreground-muted mt-0.5">Memories</p>
                <div className="mt-3 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* API Keys Card */}
        <Link href="/api-keys" className="group">
          <div className="relative h-full">
            <div
              className="absolute -top-px -left-px w-20 h-14 rounded-2xl blur-[1px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
              }}
            />
            <div className="relative h-full rounded-2xl border border-border bg-surface overflow-hidden group-hover:border-emerald-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Key
                      className="h-4.5 w-4.5 text-emerald-400"
                      weight="duotone"
                    />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-foreground-subtle group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all"
                    weight="bold"
                  />
                </div>
                <div className="text-2xl font-bold">
                  {keysLoading ? "..." : (apiKeys?.keys?.length ?? 0)}
                </div>
                <p className="text-sm text-foreground-muted mt-0.5">API Keys</p>
                <div className="mt-3 h-1.5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Projects Card */}
        <Link href="/memories" className="group">
          <div className="relative h-full">
            <div
              className="absolute -top-px -left-px w-20 h-14 rounded-2xl blur-[1px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
              }}
            />
            <div className="relative h-full rounded-2xl border border-border bg-surface overflow-hidden group-hover:border-violet-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <FolderOpen
                      className="h-4.5 w-4.5 text-violet-400"
                      weight="duotone"
                    />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-foreground-subtle group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all"
                    weight="bold"
                  />
                </div>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (stats?.projects?.length ?? 0)}
                </div>
                <p className="text-sm text-foreground-muted mt-0.5">Projects</p>
                <div className="mt-3 h-1.5" />
              </div>
            </div>
          </div>
        </Link>

        {/* Current Plan Card */}
        <Link href="/settings" className="group">
          <div className="relative h-full">
            <div
              className="absolute -top-px -left-px w-20 h-14 rounded-2xl blur-[1px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at top left, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
              }}
            />
            <div className="relative h-full rounded-2xl border border-border bg-surface overflow-hidden group-hover:border-amber-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <ChartLineUp
                      className="h-4.5 w-4.5 text-amber-400"
                      weight="duotone"
                    />
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-foreground-subtle group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
                    weight="bold"
                  />
                </div>
                <div className="text-2xl font-bold capitalize">
                  {subLoading ? "..." : subscription?.plan || "Free"}
                </div>
                <p className="text-sm text-foreground-muted mt-0.5">
                  Current Plan
                </p>
                <div className="mt-3 h-1.5" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="relative">
          <div
            className="absolute -top-px -left-px w-28 h-16 rounded-2xl blur-[1px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
            }}
          />
          <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />

            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center">
                    <Tag
                      className="h-4.5 w-4.5 text-foreground-muted"
                      weight="duotone"
                    />
                  </div>
                  <h3 className="font-semibold">Categories</h3>
                </div>
                <span className="text-xs text-foreground-muted">
                  {totalCategorized} categorized
                </span>
              </div>

              {hasMemories ? (
                <div className="space-y-3">
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const count =
                      stats?.categories[key as keyof typeof stats.categories] ??
                      0;
                    const percentage =
                      totalCategorized > 0
                        ? Math.round((count / totalCategorized) * 100)
                        : 0;
                    const Icon = config.icon;

                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            config.bg,
                          )}
                        >
                          <Icon
                            className={cn("h-4 w-4", config.color)}
                            weight="duotone"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm capitalize">{key}</span>
                            <span className="text-xs text-foreground-muted">
                              {count}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                key === "preference" &&
                                  "bg-gradient-to-r from-accent to-accent-hover",
                                key === "fact" && "bg-emerald-500",
                                key === "decision" && "bg-violet-500",
                                key === "context" && "bg-amber-500",
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-foreground-muted">
                    No memories yet. Start chatting with your AI to save
                    memories!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Memories */}
        <div className="relative">
          <div
            className="absolute -top-px -left-px w-28 h-16 rounded-2xl blur-[1px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.1) 30%, transparent 60%)",
            }}
          />
          <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />

            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center">
                    <Clock
                      className="h-4.5 w-4.5 text-foreground-muted"
                      weight="duotone"
                    />
                  </div>
                  <h3 className="font-semibold">Recent Memories</h3>
                </div>
                {hasMemories && (
                  <Link
                    href="/memories"
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="h-3 w-3" weight="bold" />
                  </Link>
                )}
              </div>

              {hasMemories && stats?.recentMemories?.length ? (
                <div className="space-y-2">
                  {stats.recentMemories.slice(0, 4).map((memory) => (
                    <Link
                      key={memory.id}
                      href="/memories"
                      className="group block p-3 rounded-xl bg-surface-elevated/30 border border-border hover:border-accent/20 transition-colors"
                    >
                      <p className="text-sm line-clamp-1 group-hover:text-accent transition-colors">
                        {memory.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {memory.category && (
                          <span
                            className={cn(
                              "text-xs px-1.5 py-0.5 rounded",
                              categoryConfig[memory.category]?.bg,
                              categoryConfig[memory.category]?.color,
                            )}
                          >
                            {memory.category}
                          </span>
                        )}
                        <span className="text-xs text-foreground-subtle flex items-center gap-1">
                          {memory.project === "Global" ? (
                            <Globe className="h-3 w-3" weight="duotone" />
                          ) : (
                            <FolderOpen className="h-3 w-3" weight="duotone" />
                          )}
                          {memory.project}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-foreground-muted">
                    Your recent memories will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Only show when no memories (onboarding) */}
      {!hasMemories && (
        <div className="relative">
          <div
            className="absolute -top-px -left-px w-28 h-16 rounded-2xl blur-[1px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top left, rgba(232,97,60,0.3) 0%, rgba(232,97,60,0.1) 30%, transparent 60%)",
            }}
          />
          <div className="relative rounded-2xl border border-accent/20 bg-surface overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-transparent to-transparent pointer-events-none" />

            <div className="relative p-5">
              <h3 className="text-lg font-semibold mb-2">Get Started</h3>
              <p className="text-sm text-foreground-muted mb-4">
                Set up MemContext in 2 simple steps
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/api-keys"
                  className="group flex items-center gap-3 p-4 rounded-xl bg-surface-elevated/50 border border-border hover:border-accent/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                    <Key className="h-5 w-5 text-accent" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm group-hover:text-accent transition-colors">
                      1. Create API Key
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Generate a key for your AI
                    </div>
                  </div>
                </Link>

                <Link
                  href="/mcp"
                  className="group flex items-center gap-3 p-4 rounded-xl bg-surface-elevated/50 border border-border hover:border-accent/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors shrink-0">
                    <Brain className="h-5 w-5 text-accent" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm group-hover:text-accent transition-colors">
                      2. Configure MCP
                    </div>
                    <div className="text-xs text-foreground-muted">
                      Add config to your AI tool
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
