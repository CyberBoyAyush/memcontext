import { requireAdmin } from "@/lib/dal";
import { Sidebar } from "@/components/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-64">
        <div className="p-6 pt-20 md:pt-6">
          {/* Admin indicator banner */}
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-500">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 256 256">
              <path d="M208,136H128V99.31l34.34-34.35a8,8,0,0,0-11.31-11.31L128,76.69V48a8,8,0,0,0-16,0V76.69L88.97,53.65a8,8,0,0,0-11.31,11.31L112,99.31V136H32a8,8,0,0,0,0,16h80v36.69L77.66,223a8,8,0,0,0,11.31,11.31L112,211.31V240a8,8,0,0,0,16,0V211.31l23,23a8,8,0,0,0,11.31-11.31L128,188.69V152h80a8,8,0,0,0,0-16Z" />
            </svg>
            Admin Mode - Actions are logged
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
