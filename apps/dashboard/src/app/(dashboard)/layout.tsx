import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 md:ml-64 p-3 md:pl-0 h-screen">
        <div className="h-full rounded-xl border border-border bg-surface p-6 pt-20 md:pt-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
