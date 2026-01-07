import { requireAdmin } from "@/lib/dal";
import { AdminLayoutContent } from "./layout-content";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
