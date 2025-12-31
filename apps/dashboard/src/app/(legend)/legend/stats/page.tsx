"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Brain, ChartBar, Wallet } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";
import { adminStatsQueryOptions } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";

const planColors: Record<string, { bg: string; bar: string }> = {
  free: { bg: "bg-gray-500/10", bar: "bg-gray-500" },
  hobby: { bg: "bg-blue-500/10", bar: "bg-blue-500" },
  pro: { bg: "bg-purple-500/10", bar: "bg-purple-500" },
};

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-elevated">
            <Icon className="h-6 w-6 text-foreground-muted" weight="duotone" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground-muted">{title}</p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse bg-surface-elevated rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            {description && (
              <p className="text-xs text-foreground-subtle mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanBreakdown({
  usersByPlan,
  totalUsers,
  loading,
}: {
  usersByPlan: Record<string, number>;
  totalUsers: number;
  loading?: boolean;
}) {
  const plans = ["free", "hobby", "pro"];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
            <Wallet
              className="h-5 w-5 text-foreground-muted"
              weight="duotone"
            />
          </div>
          <div>
            <h3 className="font-semibold">Users by Plan</h3>
            <p className="text-sm text-foreground-muted">
              Distribution across subscription tiers
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-20 bg-surface-elevated rounded mb-2" />
                <div className="h-8 bg-surface-elevated rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const count = usersByPlan[plan] || 0;
              const percentage =
                totalUsers > 0 ? (count / totalUsers) * 100 : 0;
              const colors = planColors[plan] || planColors.free;

              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium capitalize">
                      {plan}
                    </span>
                    <span className="text-sm text-foreground-muted">
                      {count} users ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-3 bg-surface-elevated rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        colors.bar,
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Total Users</span>
              <span className="font-medium">{totalUsers}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminStatsPage() {
  const { data, isLoading } = useQuery(adminStatsQueryOptions());

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
          <ChartBar
            className="h-5 w-5 text-foreground-muted"
            weight="duotone"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
          <p className="text-sm text-foreground-muted">
            System-wide metrics and analytics
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Users"
          value={data?.totalUsers ?? 0}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Total Memories"
          value={data?.totalMemories ?? 0}
          icon={Brain}
          description="Active, non-deleted memories"
          loading={isLoading}
        />
        <StatCard
          title="Avg Memories/User"
          value={
            data && data.totalUsers > 0
              ? (data.totalMemories / data.totalUsers).toFixed(1)
              : "0"
          }
          icon={ChartBar}
          loading={isLoading}
        />
      </div>

      {/* Plan Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlanBreakdown
          usersByPlan={data?.usersByPlan || {}}
          totalUsers={data?.totalUsers || 0}
          loading={isLoading}
        />

        {/* Quick Stats */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
                <Brain
                  className="h-5 w-5 text-foreground-muted"
                  weight="duotone"
                />
              </div>
              <div>
                <h3 className="font-semibold">Memory Statistics</h3>
                <p className="text-sm text-foreground-muted">
                  Usage and storage metrics
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse flex justify-between py-3"
                  >
                    <div className="h-4 w-32 bg-surface-elevated rounded" />
                    <div className="h-4 w-20 bg-surface-elevated rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-foreground-muted">
                    Total Memories
                  </span>
                  <span className="text-sm font-medium">
                    {data?.totalMemories?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-foreground-muted">
                    Average per User
                  </span>
                  <span className="text-sm font-medium">
                    {data && data.totalUsers > 0
                      ? (data.totalMemories / data.totalUsers).toFixed(1)
                      : "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-foreground-muted">
                    Free Plan Users
                  </span>
                  <span className="text-sm font-medium">
                    {data?.usersByPlan?.free || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-foreground-muted">
                    Paid Plan Users
                  </span>
                  <span className="text-sm font-medium">
                    {(data?.usersByPlan?.hobby || 0) +
                      (data?.usersByPlan?.pro || 0)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
