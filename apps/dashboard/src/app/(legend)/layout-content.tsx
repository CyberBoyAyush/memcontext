"use client";

import { Sidebar } from "@/components/sidebar";
import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider";
import { cn } from "@/lib/utils";

function AdminContent({ children }: { children: React.ReactNode }) {
  const { collapsed, hoverPeek } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div
        className={cn(
          "flex-1 min-w-0 p-3 md:pl-0 h-screen transition-all duration-300",
          collapsed ? "md:ml-16" : hoverPeek ? "md:ml-60" : "md:ml-64",
        )}
      >
        <div className="h-full rounded-xl border border-border bg-surface p-6 pt-12 md:pt-6 overflow-y-auto overflow-x-hidden">
          {/* Admin indicator banner */}
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-500">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 256 256">
              <path d="M208,136H128V99.31l34.34-34.35a8,8,0,0,0-11.31-11.31L128,76.69V48a8,8,0,0,0-16,0V76.69L88.97,53.65a8,8,0,0,0-11.31,11.31L112,99.31V136H32a8,8,0,0,0,0,16h80v36.69L77.66,223a8,8,0,0,0,11.31,11.31L112,211.31V240a8,8,0,0,0,16,0V211.31l23,23a8,8,0,0,0,11.31-11.31L128,188.69V152h80a8,8,0,0,0,0-16Z" />
            </svg>
            Admin Mode - Actions are logged
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminContent>{children}</AdminContent>
    </SidebarProvider>
  );
}
