import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function McpSetupBadge({
  variant,
  className,
}: {
  variant: "recommended" | "advanced";
  className?: string;
}) {
  const recommended = variant === "recommended";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider leading-none shrink-0",
        recommended
          ? "border-accent/25 bg-accent/10 text-accent"
          : "border-border bg-background-secondary text-foreground-muted",
        className,
      )}
    >
      {recommended && <Sparkles className="h-2.5 w-2.5" aria-hidden />}
      {recommended ? "Recommended" : "Advanced"}
    </span>
  );
}
