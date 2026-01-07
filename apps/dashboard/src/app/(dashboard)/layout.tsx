"use client";

import { Sidebar } from "@/components/sidebar";
import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider";
import { cn } from "@/lib/utils";

function DashboardContent({ children }: { children: React.ReactNode }) {
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
          {children}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
