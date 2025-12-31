import Skeleton from "react-loading-skeleton";

function StatCardSkeleton({ hasProgress = false }: { hasProgress?: boolean }) {
  return (
    <div className="relative h-full">
      <div className="relative h-full rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="relative p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton width={36} height={36} borderRadius={12} />
            <Skeleton width={24} height={14} />
          </div>
          <Skeleton width={80} height={28} className="mb-1" />
          <Skeleton width={60} height={16} />
          {hasProgress && (
            <div className="mt-3">
              <Skeleton height={6} borderRadius={999} />
            </div>
          )}
          {!hasProgress && <div className="mt-3 h-1.5" />}
        </div>
      </div>
    </div>
  );
}

function CategoryItemSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton width={32} height={32} borderRadius={8} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <Skeleton width={70} height={16} />
          <Skeleton width={24} height={14} />
        </div>
        <Skeleton height={6} borderRadius={999} />
      </div>
    </div>
  );
}

function RecentMemorySkeleton() {
  return (
    <div className="p-3 rounded-xl bg-surface-elevated/30 border border-border">
      <Skeleton height={16} className="mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton width={60} height={18} borderRadius={4} />
        <Skeleton width={80} height={14} />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Welcome Header Skeleton */}
      <div className="relative">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton width={280} height={36} className="mb-2" />
            <Skeleton width={260} height={20} />
          </div>
          <Skeleton width={100} height={32} borderRadius={999} />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton hasProgress />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Two Column Layout Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Categories Card Skeleton */}
        <div className="relative">
          <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton width={36} height={36} borderRadius={12} />
                  <Skeleton width={90} height={20} />
                </div>
                <Skeleton width={80} height={14} />
              </div>
              <div className="space-y-3">
                <CategoryItemSkeleton />
                <CategoryItemSkeleton />
                <CategoryItemSkeleton />
                <CategoryItemSkeleton />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Memories Card Skeleton */}
        <div className="relative">
          <div className="relative rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="relative p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton width={36} height={36} borderRadius={12} />
                  <Skeleton width={130} height={20} />
                </div>
                <Skeleton width={60} height={14} />
              </div>
              <div className="space-y-2">
                <RecentMemorySkeleton />
                <RecentMemorySkeleton />
                <RecentMemorySkeleton />
                <RecentMemorySkeleton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
