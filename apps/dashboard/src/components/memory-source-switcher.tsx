"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Buildings, CaretDown, Check, User } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/providers/workspace-provider";

export type MemorySource =
  | { type: "user" }
  | { type: "workspace"; id: string; name: string };

interface MemorySourceSwitcherProps {
  value: MemorySource;
  onChange: (source: MemorySource) => void;
  className?: string;
}

/**
 * Switches between personal memories and the mounted workspace's vault memories.
 * Workspace switching itself stays centralized in the sidebar.
 */
export function MemorySourceSwitcher({
  value,
  onChange,
  className,
}: MemorySourceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const { activeWorkspace } = useWorkspace();

  const isUser = value.type === "user";
  const label = isUser ? "My memories" : "Context Vault";

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
          "inline-flex h-10 w-full max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors",
          "hover:bg-surface-elevated hover:border-border-hover",
          "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
        )}
      >
        {isUser ? (
          <User
            className="h-4 w-4 shrink-0 text-foreground-muted"
            weight="duotone"
          />
        ) : (
          <Buildings className="h-4 w-4 shrink-0 text-accent" weight="duotone" />
        )}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <CaretDown
          className={cn(
            "h-3 w-3 shrink-0 text-foreground-muted transition-transform",
            open && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setOpen(false)}
            />
            <div
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[61] w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg animate-scale-in"
            >
              {/* Personal */}
              <div className="p-1">
                <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Personal
                </div>
                <button
                  type="button"
                  onClick={() => select({ type: "user" })}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors",
                    isUser
                      ? "bg-surface text-foreground"
                      : "text-foreground-muted hover:bg-surface hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <User
                      className="h-3.5 w-3.5 text-accent shrink-0"
                      weight="duotone"
                    />
                    <span className="truncate">My memories</span>
                  </span>
                  {isUser && (
                    <Check className="h-3 w-3 shrink-0" weight="bold" />
                  )}
                </button>
              </div>

              {/* Workspaces */}
              <div className="border-t border-border p-1">
                <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Mounted workspace
                </div>
                {!activeWorkspace ? (
                  <div className="px-2.5 py-2.5 text-[11px] text-foreground-subtle">
                    No active workspace selected.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      select({
                        type: "workspace",
                        id: activeWorkspace.id,
                        name: activeWorkspace.name,
                      })
                    }
                    className={cn(
                      "w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] text-left transition-colors",
                      value.type === "workspace"
                        ? "bg-surface text-foreground"
                        : "text-foreground-muted hover:bg-surface hover:text-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Buildings
                        className="h-3.5 w-3.5 text-accent shrink-0"
                        weight="duotone"
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate leading-tight">
                          Context Vault
                        </span>
                        <span className="truncate text-[10px] leading-tight text-foreground-subtle">
                          {activeWorkspace.name}
                        </span>
                      </span>
                    </span>
                    {value.type === "workspace" && (
                      <Check className="h-3 w-3 shrink-0" weight="bold" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
