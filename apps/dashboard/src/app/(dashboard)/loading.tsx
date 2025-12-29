import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-muted" />
        <p className="text-sm text-foreground-muted">Loading...</p>
      </div>
    </div>
  );
}
