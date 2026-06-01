"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Buildings, CaretDown, Check, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { workspacesQueryOptions } from "@/lib/queries/company-brain";

export type MemorySource =
  | { type: "user" }
  | { type: "workspace"; id: string; name: string };

interface MemorySourceSwitcherProps {
  value: MemorySource;
  onChange: (source: MemorySource) => void;
  className?: string;
}

/**
 * Switches the memories view between personal ("My memories") and a workspace's
 * Context Vault memories. The menu renders in a portal so it is never clipped
 * by ancestor `overflow-hidden` containers.
 */
export function MemorySourceSwitcher({
  value,
  onChange,
  className,
}: MemorySourceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const { data } = useQuery(workspacesQueryOptions());
  const workspaces = data?.workspaces ?? [];

  const isUser = value.type === "user";
  const label = isUser ? "My memories" : value.name;

  // Position the menu under the trigger using viewport coordinates.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.bottom + 8, left: rect.left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  function select(next: MemorySource) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors",
          "hover:bg-surface-elevated hover:border-border-hover",
          "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-foreground-muted" weight="duotone" />
        ) : (
          <Buildings className="h-4 w-4 text-accent" weight="duotone" />
        )}
        <span className="max-w-[160px] truncate">{label}</span>
        <CaretDown
          className={cn(
            "h-3 w-3 text-foreground-muted transition-transform",
            open && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[61] w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-lg animate-scale-in"
            >
              {/* Personal */}
              <div className="p-1.5">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Personal
                </div>
                <button
                  type="button"
                  onClick={() => select({ type: "user" })}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                    isUser
                      ? "bg-surface text-foreground"
                      : "text-foreground-muted hover:bg-surface hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <User
                      className="h-4 w-4 text-accent shrink-0"
                      weight="duotone"
                    />
                    <span className="truncate">My memories</span>
                  </span>
                  {isUser && (
                    <Check className="h-3.5 w-3.5 shrink-0" weight="bold" />
                  )}
                </button>
              </div>

              {/* Workspaces */}
              <div className="border-t border-border p-1.5">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Workspaces
                </div>
                {workspaces.length === 0 ? (
                  <div className="px-3 py-3 text-[11px] text-foreground-subtle">
                    No workspaces yet. Create one in Settings.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto scrollbar-hide">
                    {workspaces.map((workspace) => {
                      const active =
                        value.type === "workspace" &&
                        value.id === workspace.id;
                      return (
                        <button
                          key={workspace.id}
                          type="button"
                          onClick={() =>
                            select({
                              type: "workspace",
                              id: workspace.id,
                              name: workspace.name,
                            })
                          }
                          className={cn(
                            "w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                            active
                              ? "bg-surface text-foreground"
                              : "text-foreground-muted hover:bg-surface hover:text-foreground",
                          )}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <Buildings
                              className="h-4 w-4 text-accent shrink-0"
                              weight="duotone"
                            />
                            <span className="truncate">{workspace.name}</span>
                          </span>
                          {active && (
                            <Check
                              className="h-3.5 w-3.5 shrink-0"
                              weight="bold"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
