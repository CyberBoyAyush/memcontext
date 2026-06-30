"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Buildings,
  CaretDown,
  Check,
  GearSix,
  Plus,
  UsersThree,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/queries/context-vault";

interface WorkspaceSelectProps {
  workspaces: Workspace[];
  value: string;
  onChange: (workspaceId: string) => void;
  onManage?: () => void;
  onManageTeam?: () => void;
  onAdd?: () => void;
  className?: string;
}

function workspaceTierLabel(workspace?: Workspace) {
  const plan = workspace?.billingOwnerPlan ?? "free";
  return `${plan.charAt(0).toUpperCase()}${plan.slice(1)} Workspace`;
}

/**
 * Themed workspace picker for the Context Vault. Renders its menu in a portal
 * so it is never clipped, matching the dashboard dropdown aesthetic.
 */
export function WorkspaceSelect({
  workspaces,
  value,
  onChange,
  onManage,
  onManageTeam,
  onAdd,
  className,
}: WorkspaceSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const active = workspaces.find((workspace) => workspace.id === value);
  const label = active?.name ?? "No workspace yet";
  const tierLabel = active ? workspaceTierLabel(active) : null;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors sm:w-56",
          "hover:bg-surface-elevated hover:border-border-hover",
          "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Buildings
            className="h-4 w-4 shrink-0 text-accent"
            weight="duotone"
          />
          <span className="flex min-w-0 flex-col items-start">
            <span className="truncate leading-tight">{label}</span>
            {tierLabel && (
              <span className="truncate text-[10px] font-normal leading-tight text-foreground-subtle">
                {tierLabel}
              </span>
            )}
          </span>
        </span>
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
              style={{
                top: coords.top,
                left: coords.left,
                width: coords.width,
              }}
              className="fixed z-[61] min-w-56 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-lg animate-scale-in"
            >
              <div className="p-1.5">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-subtle">
                  Workspaces
                </div>
                {workspaces.length === 0 ? (
                  <div className="px-3 py-3 text-[11px] text-foreground-subtle">
                    No workspaces yet.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto scrollbar-hide">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => select(workspace.id)}
                        className={cn(
                          "w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                          workspace.id === value
                            ? "bg-surface text-foreground"
                            : "text-foreground-muted hover:bg-surface hover:text-foreground",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Buildings
                            className="h-4 w-4 shrink-0 text-accent"
                            weight="duotone"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate leading-tight">
                              {workspace.name}
                            </span>
                            <span className="truncate text-[10px] leading-tight text-foreground-subtle">
                              {workspaceTierLabel(workspace)}
                            </span>
                          </span>
                        </span>
                        {workspace.id === value && (
                          <Check
                            className="h-3.5 w-3.5 shrink-0"
                            weight="bold"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(onAdd || onManage || onManageTeam) && (
                <div className="border-t border-border p-1.5">
                  {onAdd && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onAdd();
                      }}
                      className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
                    >
                      <Plus className="h-4 w-4 shrink-0" weight="bold" />
                      Add workspace
                    </button>
                  )}
                  {onManageTeam && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onManageTeam();
                      }}
                      className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
                    >
                      <UsersThree
                        className="h-4 w-4 shrink-0"
                        weight="duotone"
                      />
                      Manage team
                    </button>
                  )}
                  {onManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onManage();
                      }}
                      className="w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
                    >
                      <GearSix className="h-4 w-4 shrink-0" weight="duotone" />
                      Manage workspaces
                    </button>
                  )}
                </div>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
