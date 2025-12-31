"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  SpinnerGap,
  User,
  Brain,
  Calendar,
  ArrowRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminUsersQueryOptions, type AdminUser } from "@/lib/queries/admin";
import { formatDateTime, cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

const planColors: Record<string, string> = {
  free: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  hobby: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  pro: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

function TableSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-elevated">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden md:table-cell">
                Plan
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden lg:table-cell">
                Memories
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden sm:table-cell">
                Joined
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-surface-elevated" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-surface-elevated rounded" />
                      <div className="h-3 w-48 bg-surface-elevated rounded" />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 hidden md:table-cell">
                  <div className="h-6 w-16 bg-surface-elevated rounded-full" />
                </td>
                <td className="px-4 py-4 hidden lg:table-cell">
                  <div className="h-4 w-20 bg-surface-elevated rounded" />
                </td>
                <td className="px-4 py-4 hidden sm:table-cell">
                  <div className="h-4 w-24 bg-surface-elevated rounded" />
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="h-8 w-8 bg-surface-elevated rounded ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <tr className="group hover:bg-surface/50 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-surface-elevated border border-border overflow-hidden flex items-center justify-center shrink-0">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <User
                className="h-5 w-5 text-foreground-muted"
                weight="duotone"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{user.name}</p>
              {user.role === "admin" && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-muted truncate">
              {user.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 hidden md:table-cell">
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize border",
            planColors[user.plan] || planColors.free,
          )}
        >
          {user.plan}
        </span>
      </td>

      <td className="px-4 py-4 hidden lg:table-cell">
        <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
          <Brain className="h-4 w-4" weight="duotone" />
          <span>
            {user.memoryCount} / {user.memoryLimit}
          </span>
        </div>
      </td>

      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="flex items-center gap-1.5 text-sm text-foreground-muted">
          <Calendar className="h-4 w-4" weight="duotone" />
          <span>{formatDateTime(user.createdAt).date}</span>
        </div>
      </td>

      <td className="px-4 py-4 text-right">
        <Link href={`/legend/users/${user.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowRight className="h-4 w-4" weight="bold" />
          </Button>
        </Link>
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const offset = page * ITEMS_PER_PAGE;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, error, isFetching } = useQuery(
    adminUsersQueryOptions({
      limit: ITEMS_PER_PAGE,
      offset,
      search: search || undefined,
    }),
  );

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;
  const showingFrom = data && data.total > 0 ? offset + 1 : 0;
  const showingTo = data ? Math.min(offset + ITEMS_PER_PAGE, data.total) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
            <Users className="h-5 w-5 text-foreground-muted" weight="duotone" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-foreground-muted">
              {data?.total ? `${data.total} total users` : "Manage all users"}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-subtle"
            weight="bold"
          />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 h-10 bg-surface border-border"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton />
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-error mb-2">Failed to load users</div>
            <p className="text-sm text-foreground-muted">
              Please try again later
            </p>
          </CardContent>
        </Card>
      ) : data?.users.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <Users className="h-16 w-16 mx-auto text-foreground-subtle mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No users found</h3>
            <p className="text-foreground-muted">
              {search
                ? "Try a different search term"
                : "No users have signed up yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-elevated">
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden md:table-cell">
                      Plan
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden lg:table-cell">
                      Memories
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider hidden sm:table-cell">
                      Joined
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-foreground-muted uppercase tracking-wider w-14">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data?.users.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {data && data.total > ITEMS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
              <p className="text-sm text-foreground-muted order-2 sm:order-1">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {showingFrom}
                </span>
                {" to "}
                <span className="font-medium text-foreground">{showingTo}</span>
                {" of "}
                <span className="font-medium text-foreground">
                  {data.total}
                </span>
              </p>

              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || isFetching}
                  className="gap-1"
                >
                  <CaretLeft className="h-4 w-4" weight="bold" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "ghost"}
                        size="sm"
                        className="w-9 h-9 p-0"
                        onClick={() => setPage(pageNum)}
                        disabled={isFetching}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1 || isFetching}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <CaretRight className="h-4 w-4" weight="bold" />
                </Button>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isFetching && !isLoading && (
            <div className="fixed bottom-4 right-4 bg-surface-elevated px-4 py-2 rounded-lg border border-border shadow-lg flex items-center gap-2 animate-fade-in">
              <SpinnerGap className="h-4 w-4 animate-spin" weight="bold" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
