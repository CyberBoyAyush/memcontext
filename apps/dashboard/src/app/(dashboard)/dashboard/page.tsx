"use client";

import { useQuery } from "@tanstack/react-query";
import { Brain, Key, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface SubscriptionData {
  plan: string;
  memoryCount: number;
  memoryLimit: number;
}

interface ApiKeysData {
  keys: Array<{ id: string }>;
}

export default function DashboardPage() {
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: () => api.get<SubscriptionData>("/api/user/subscription"),
  });

  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get<ApiKeysData>("/api/api-keys"),
  });

  const stats = [
    {
      title: "Total Memories",
      value: subLoading ? "..." : (subscription?.memoryCount ?? 0),
      limit: subLoading ? undefined : subscription?.memoryLimit,
      icon: Brain,
      color: "text-blue-400",
    },
    {
      title: "API Keys",
      value: keysLoading ? "..." : (apiKeys?.keys?.length ?? 0),
      icon: Key,
      color: "text-green-400",
    },
    {
      title: "Current Plan",
      value: subLoading
        ? "..."
        : (subscription?.plan?.charAt(0).toUpperCase() ?? "") +
          (subscription?.plan?.slice(1) ?? ""),
      icon: TrendingUp,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-foreground-muted mt-1">
          Welcome to your MemContext dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground-muted">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value}
                {stat.limit !== undefined && (
                  <span className="text-sm font-normal text-foreground-muted">
                    {" "}
                    / {stat.limit}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/memories"
              className="block p-3 rounded-lg border border-border hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-foreground-muted" />
                <div>
                  <div className="font-medium">View Memories</div>
                  <div className="text-sm text-foreground-muted">
                    Browse and manage your saved memories
                  </div>
                </div>
              </div>
            </a>
            <a
              href="/api-keys"
              className="block p-3 rounded-lg border border-border hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-foreground-muted" />
                <div>
                  <div className="font-medium">Manage API Keys</div>
                  <div className="text-sm text-foreground-muted">
                    Create and manage your API keys
                  </div>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-foreground-muted">
              <p>
                MemContext helps AI assistants remember context across
                conversations. Here&apos;s how to get started:
              </p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Create an API key in the API Keys section</li>
                <li>Configure your MCP client with the API key</li>
                <li>Start saving memories through your AI assistant</li>
                <li>View and manage memories here in the dashboard</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
