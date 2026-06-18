"use client";

import { useState } from "react";
import { CaretDown, Check, Globe, Stack } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { MemoryHierarchyResponse } from "@/lib/queries/memories";

interface ScopePickerProps {
  value: string | null;
  onChange: (scope: string | null) => void;
  hierarchy?: MemoryHierarchyResponse;
  isLoading?: boolean;
  className?: string;
  buttonClassName?: string;
}

/**
 * Reusable scope picker. `null` = global/unscoped. A string = named scope.
 */
export function ScopePicker({
  value,
  onChange,
  hierarchy,
  isLoading,
  className,
  buttonClassName,
}: ScopePickerProps) {
  const [open, setOpen] = useState(false);

  const globalCount = hierarchy?.global.count ?? 0;
  const scopes = hierarchy?.scopes ?? [];

  const selectedLabel = value === null ? "Global" : value;
  const selectedCount =
    value === null
      ? globalCount
      : (scopes.find((scope) => scope.name === value)?.count ?? 0);

  function handleSelect(next: string | null) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={isLoading}
        className={cn(
          "inline-flex h-10 w-full max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors",
          "hover:bg-surface-elevated hover:border-border-hover",
          "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
          isLoading && "opacity-50 !cursor-not-allowed",
          buttonClassName,
        )}
      >
        {value === null ? (
          <Globe
            className="h-4 w-4 shrink-0 text-foreground-muted"
            weight="duotone"
          />
        ) : (
          <Stack className="h-4 w-4 shrink-0 text-accent" weight="duotone" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
        <span className="shrink-0 text-[10px] font-semibold text-foreground-subtle tabular-nums">
          {selectedCount}
        </span>
        <CaretDown
          className={cn(
            "h-3 w-3 shrink-0 text-foreground-muted transition-transform",
            open && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg animate-scale-in">
            <div className="p-1">
              <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                Memory scope
              </div>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors",
                  value === null
                    ? "bg-surface text-foreground"
                    : "text-foreground-muted hover:bg-surface hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Globe className="h-3.5 w-3.5 shrink-0" weight="duotone" />
                  <span className="truncate">Global</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] tabular-nums text-foreground-subtle">
                    {globalCount}
                  </span>
                  {value === null && (
                    <Check className="h-3 w-3" weight="bold" />
                  )}
                </span>
              </button>
            </div>

            {scopes.length > 0 && (
              <div className="border-t border-border p-1">
                <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Scopes
                </div>
                <div className="max-h-52 overflow-y-auto scrollbar-hide">
                  {scopes.map((scope) => (
                    <button
                      key={scope.name}
                      type="button"
                      onClick={() => handleSelect(scope.name)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors",
                        value === scope.name
                          ? "bg-surface text-foreground"
                          : "text-foreground-muted hover:bg-surface hover:text-foreground",
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Stack
                          className="h-3.5 w-3.5 text-accent shrink-0"
                          weight="duotone"
                        />
                        <span className="truncate">{scope.name}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] tabular-nums text-foreground-subtle">
                          {scope.count}
                        </span>
                        {value === scope.name && (
                          <Check className="h-3 w-3" weight="bold" />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scopes.length === 0 && !isLoading && (
              <div className="border-t border-border px-2.5 py-2.5 text-[11px] text-foreground-subtle">
                No named scopes yet. Memories saved with a scope will appear
                here.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
