"use client";

import { useEffect, useRef, useState, useMemo, memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Brain,
  Key,
  ChartLineUp,
  Sparkle,
  ArrowRight,
  FolderOpen,
} from "@phosphor-icons/react";
import { Bar, BarChart, XAxis, Cell, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import Link from "next/link";
import { useToast } from "@/providers/toast-provider";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

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

const chartConfig: ChartConfig = {
  count: { label: "Count", color: "var(--accent)" },
};

const ACCENT_COLOR = "#e8613c";
const ACCENT_LIGHT = "#f0856a";
const STRIPE_COLOR = "rgba(255,255,255,0.6)";

type PatternType = "diagonal" | "solid" | "dotted" | "gradient";

const PATTERN_GRADIENTS: Record<PatternType, string> = {
  diagonal: `repeating-linear-gradient(45deg, ${ACCENT_COLOR}, ${ACCENT_COLOR} 2px, ${STRIPE_COLOR} 2px, ${STRIPE_COLOR} 4px)`,
  solid: ACCENT_COLOR,
  dotted: `radial-gradient(circle, ${STRIPE_COLOR} 1px, ${ACCENT_COLOR} 1px)`,
  gradient: `linear-gradient(180deg, ${ACCENT_LIGHT} 0%, ${ACCENT_COLOR} 100%)`,
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      category: string;
      count: number;
      pattern: PatternType;
    };
  }>;
}

const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isDotted = data.pattern === "dotted";

  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 shadow-lg">
      <p className="text-sm font-medium mb-1">{data.category}</p>
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-sm shrink-0"
          style={{
            backgroundImage: PATTERN_GRADIENTS[data.pattern],
            backgroundColor: isDotted ? ACCENT_COLOR : undefined,
            backgroundSize: isDotted ? "5px 5px" : undefined,
            backgroundRepeat: isDotted ? "repeat" : undefined,
          }}
        />
        <span className="text-sm text-foreground-muted">
          count:{" "}
          <span className="text-foreground font-medium">{data.count}</span>
        </span>
      </div>
    </div>
  );
});

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return "Yesterday";
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ChartPatterns = memo(function ChartPatterns() {
  return (
    <>
      {/* Dotted background pattern for chart area */}
      <pattern
        id="categories-pattern-dots"
        x="0"
        y="0"
        width="10"
        height="10"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="2" cy="2" r="1" fill="var(--border)" />
      </pattern>
      {/* Diagonal stripes pattern - for Preference (thinner lines) */}
      <pattern
        id="pattern-diagonal"
        x="0"
        y="0"
        width="5"
        height="5"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-45)"
      >
        <rect width="5" height="5" fill={ACCENT_COLOR} />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="5"
          stroke={STRIPE_COLOR}
          strokeWidth="1.5"
        />
      </pattern>
      {/* Dotted pattern - for Decision (smaller dots) */}
      <pattern
        id="pattern-dotted"
        x="0"
        y="0"
        width="5"
        height="5"
        patternUnits="userSpaceOnUse"
      >
        <rect width="5" height="5" fill={ACCENT_COLOR} />
        <circle cx="2.5" cy="2.5" r="1" fill={STRIPE_COLOR} />
      </pattern>
      {/* Gradient - for Context (lighter top to darker bottom) */}
      <linearGradient id="pattern-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={ACCENT_LIGHT} />
        <stop offset="100%" stopColor={ACCENT_COLOR} />
      </linearGradient>
    </>
  );
});

// Utility function to get fill pattern - moved outside component to avoid recreation
function getPatternFill(pattern: PatternType): string {
  switch (pattern) {
    case "diagonal":
      return "url(#pattern-diagonal)";
    case "dotted":
      return "url(#pattern-dotted)";
    case "gradient":
      return "url(#pattern-gradient)";
    default:
      return ACCENT_COLOR;
  }
}

interface CategoriesChartProps {
  stats: DashboardStats | undefined;
  hasMemories: boolean;
  totalCategorized: number;
}

const CategoriesChart = memo(function CategoriesChart({
  stats,
  hasMemories,
  totalCategorized,
}: CategoriesChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(
    () => [
      {
        category: "Preference",
        count: stats?.categories.preference ?? 0,
        pattern: "diagonal" as PatternType,
      },
      {
        category: "Fact",
        count: stats?.categories.fact ?? 0,
        pattern: "solid" as PatternType,
      },
      {
        category: "Decision",
        count: stats?.categories.decision ?? 0,
        pattern: "dotted" as PatternType,
      },
      {
        category: "Context",
        count: stats?.categories.context ?? 0,
        pattern: "gradient" as PatternType,
      },
    ],
    [stats],
  );

  const activeData = useMemo(
    () => (activeIndex !== null ? chartData[activeIndex] : null),
    [activeIndex, chartData],
  );

  const handleMouseLeave = useCallback(() => setActiveIndex(null), []);

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold">Categories</h3>
            <p className="text-xs text-foreground-muted">
              {activeData
                ? `${activeData.category}: ${activeData.count} memories`
                : `${totalCategorized} categorized`}
            </p>
          </div>
          {/* Legend */}
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-2 sm:gap-4">
            {chartData.map((item, index) => {
              const isDotted = item.pattern === "dotted";
              const isActive = activeIndex === null || activeIndex === index;
              return (
                <div
                  key={item.category}
                  className="flex items-center gap-1.5 cursor-pointer"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <span
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm shrink-0"
                    style={{
                      backgroundImage: PATTERN_GRADIENTS[item.pattern],
                      backgroundColor: isDotted ? ACCENT_COLOR : undefined,
                      backgroundSize: isDotted ? "6px 6px" : undefined,
                      backgroundRepeat: isDotted ? "repeat" : undefined,
                      opacity: isActive ? 1 : 0.3,
                      transition: "opacity 200ms",
                    }}
                  />
                  <span
                    className="text-[10px] sm:text-xs text-foreground-muted whitespace-nowrap"
                    style={{
                      opacity: isActive ? 1 : 0.5,
                      transition: "opacity 200ms",
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {hasMemories ? (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                onMouseLeave={handleMouseLeave}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                barCategoryGap="15%"
              >
                <defs>
                  <ChartPatterns />
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="100%"
                  fill="url(#categories-pattern-dots)"
                />
                <XAxis
                  dataKey="category"
                  tickLine={false}
                  tickMargin={12}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--foreground-muted)" }}
                />
                <ChartTooltip cursor={false} content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={100}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getPatternFill(entry.pattern)}
                      fillOpacity={
                        activeIndex === null
                          ? 1
                          : activeIndex === index
                            ? 1
                            : 0.3
                      }
                      onMouseEnter={() => setActiveIndex(index)}
                      style={{
                        cursor: "pointer",
                        transition: "opacity 200ms",
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-foreground-muted">
              No memories yet. Start chatting with your AI to save memories!
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const hasShownError = useRef(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "access_denied" && !hasShownError.current) {
      hasShownError.current = true;
      window.history.replaceState({}, "", "/dashboard");
      setTimeout(() => {
        toast.error("Access denied. Admin privileges required.");
      }, 100);
    }
  }, [searchParams, toast]);

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

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Memory Usage Card */}
        <Link href="/memories" className="group">
          <div className="h-full rounded-xl sm:rounded-2xl border border-border bg-surface group-hover:border-border-hover transition-colors p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-foreground-muted">
                Memories
              </p>
              <div className="text-xl sm:text-3xl font-semibold mt-0.5 sm:mt-1">
                {subLoading ? "..." : (subscription?.memoryCount ?? 0)}
                <span className="text-xs sm:text-base font-normal text-foreground-muted">
                  /{subscription?.memoryLimit ?? 100}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-surface-elevated border-border border flex items-center justify-center shrink-0">
              <Brain
                size={18}
                className="text-foreground-muted sm:hidden"
                weight="duotone"
              />
              <Brain
                size={24}
                className="text-foreground-muted hidden sm:block"
                weight="duotone"
              />
            </div>
          </div>
        </Link>

        {/* API Keys Card */}
        <Link href="/api-keys" className="group">
          <div className="h-full rounded-xl sm:rounded-2xl border border-border bg-surface group-hover:border-border-hover transition-colors p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-foreground-muted">
                API Keys
              </p>
              <div className="text-xl sm:text-3xl font-semibold mt-0.5 sm:mt-1">
                {keysLoading ? "..." : (apiKeys?.keys?.length ?? 0)}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0">
              <Key
                size={18}
                className="text-foreground-muted sm:hidden"
                weight="duotone"
              />
              <Key
                size={24}
                className="text-foreground-muted hidden sm:block"
                weight="duotone"
              />
            </div>
          </div>
        </Link>

        {/* Projects Card */}
        <Link href="/memories" className="group">
          <div className="h-full rounded-xl sm:rounded-2xl border border-border bg-surface group-hover:border-border-hover transition-colors p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-foreground-muted">
                Projects
              </p>
              <div className="text-xl sm:text-3xl font-semibold mt-0.5 sm:mt-1">
                {statsLoading ? "..." : (stats?.projects?.length ?? 0)}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0">
              <FolderOpen
                size={18}
                className="text-foreground-muted sm:hidden"
                weight="duotone"
              />
              <FolderOpen
                size={24}
                className="text-foreground-muted hidden sm:block"
                weight="duotone"
              />
            </div>
          </div>
        </Link>

        {/* Current Plan Card */}
        <Link href="/subscription" className="group">
          <div className="h-full rounded-xl sm:rounded-2xl border border-border bg-surface group-hover:border-border-hover transition-colors p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-foreground-muted">
                Current Plan
              </p>
              <div className="text-xl sm:text-3xl font-semibold mt-0.5 sm:mt-1 capitalize">
                {subLoading ? "..." : subscription?.plan || "Free"}
              </div>
            </div>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0">
              <ChartLineUp
                size={18}
                className="text-foreground-muted sm:hidden"
                weight="duotone"
              />
              <ChartLineUp
                size={24}
                className="text-foreground-muted hidden sm:block"
                weight="duotone"
              />
            </div>
          </div>
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <CategoriesChart
          stats={stats}
          hasMemories={hasMemories}
          totalCategorized={totalCategorized}
        />

        {/* Recent Memories */}
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent Memories</h3>
              {hasMemories && (
                <Link
                  href="/memories"
                  className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3 w-3" weight="bold" />
                </Link>
              )}
            </div>

            {hasMemories && stats?.recentMemories?.length ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px]">
                    <thead>
                      <tr className="bg-surface-elevated border-b border-border">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-48 border-r border-border">
                          Memory
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-28 border-r border-border">
                          Category
                        </th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-20">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentMemories.slice(0, 5).map((memory) => {
                        const timeAgo = getTimeAgo(memory.createdAt);
                        return (
                          <tr
                            key={memory.id}
                            className="group hover:bg-surface-elevated/50 transition-colors border-b border-border last:border-b-0"
                          >
                            <td className="px-3 py-3 border-r border-border">
                              <Link
                                href="/memories"
                                className="text-sm truncate block max-w-[180px]"
                              >
                                {memory.content}
                              </Link>
                            </td>
                            <td className="px-3 py-3 border-r border-border">
                              {memory.category ? (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent capitalize">
                                  {memory.category}
                                </span>
                              ) : (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-surface-elevated text-foreground-muted">
                                  Uncategorized
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs text-foreground-muted">
                                {timeAgo}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-surface-elevated border border-border flex items-center justify-center mx-auto mb-3">
                  <Brain
                    size={24}
                    className="text-foreground-muted"
                    weight="duotone"
                  />
                </div>
                <p className="text-sm text-foreground-muted">
                  Your recent memories will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions - Only show when no memories (onboarding) */}
      {!hasMemories && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="p-5">
            <h3 className="text-lg font-semibold mb-2">Get Started</h3>
            <p className="text-sm text-foreground-muted mb-4">
              Set up MemContext in 2 simple steps
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/api-keys"
                className="group flex items-center gap-3 p-4 rounded-xl bg-surface-elevated/50 border border-border hover:border-border-hover transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                  <Key
                    className="h-5 w-5 text-foreground-muted"
                    weight="duotone"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">1. Create API Key</div>
                  <div className="text-xs text-foreground-muted">
                    Generate a key for your AI
                  </div>
                </div>
              </Link>

              <Link
                href="/mcp"
                className="group flex items-center gap-3 p-4 rounded-xl bg-surface-elevated/50 border border-border hover:border-border-hover transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0">
                  <Brain
                    className="h-5 w-5 text-foreground-muted"
                    weight="duotone"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">2. Configure MCP</div>
                  <div className="text-xs text-foreground-muted">
                    Add config to your AI tool
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
