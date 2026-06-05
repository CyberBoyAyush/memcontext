"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ThemedSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ThemedSelectProps {
  value: string;
  options: ThemedSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  placeholder?: string;
  align?: "left" | "right";
  /** Capitalize the displayed values (used for role labels) */
  capitalize?: boolean;
}

/**
 * Themed dropdown that matches the app's dark aesthetic (see scope-picker).
 * Drop-in replacement for native <select> elements. The menu renders in a
 * portal with fixed positioning so it is never clipped by ancestor
 * `overflow-*` / scroll containers (e.g. modal bodies).
 */
export function ThemedSelect({
  value,
  options,
  onChange,
  disabled,
  className,
  buttonClassName,
  menuClassName,
  placeholder = "Select",
  align = "right",
  capitalize,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{
    left: number;
    right: number;
    width: number;
    placement: "bottom" | "top";
    top?: number;
    bottom?: number;
    maxHeight: number;
  }>({
    left: 0,
    right: 0,
    width: 0,
    placement: "bottom",
    top: 0,
    maxHeight: 240,
  });

  const selected = options.find((option) => option.value === value);

  // Position the menu relative to the trigger using viewport coordinates,
  // flipping above the trigger when there isn't enough room below.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const GAP = 6;
    const MARGIN = 12;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
      const spaceAbove = rect.top - GAP - MARGIN;
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
      setCoords({
        left: rect.left,
        right: window.innerWidth - rect.right,
        width: rect.width,
        placement: openUp ? "top" : "bottom",
        top: openUp ? undefined : rect.bottom + GAP,
        bottom: openUp ? window.innerHeight - rect.top + GAP : undefined,
        maxHeight: Math.min(240, openUp ? spaceAbove : spaceBelow),
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  function handleSelect(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen((current) => !current)}
        disabled={disabled}
        className={cn(
          "inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors",
          "hover:border-border-hover hover:bg-surface-elevated",
          "focus:outline-none focus:ring-2 focus:ring-accent/20",
          disabled && "cursor-not-allowed opacity-50",
          capitalize && "capitalize",
          buttonClassName,
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <CaretDown
          className={cn(
            "h-3 w-3 shrink-0 text-foreground-muted transition-transform",
            open && "rotate-180",
          )}
          weight="bold"
        />
      </button>

      {open &&
        !disabled &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[80]"
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                ...(coords.placement === "bottom"
                  ? { top: coords.top }
                  : { bottom: coords.bottom }),
                ...(align === "right"
                  ? { right: coords.right }
                  : { left: coords.left }),
                minWidth: coords.width,
                maxHeight: coords.maxHeight,
              }}
              className={cn(
                "fixed z-[81] overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-surface-elevated p-1.5 shadow-lg animate-scale-in scrollbar-hide",
                menuClassName,
              )}
            >
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() =>
                      !option.disabled && handleSelect(option.value)
                    }
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs transition-colors",
                      capitalize && "capitalize",
                      option.disabled
                        ? "cursor-not-allowed text-foreground-subtle opacity-60"
                        : active
                          ? "bg-surface text-foreground"
                          : "text-foreground-muted hover:bg-surface hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    {active && (
                      <Check className="h-3.5 w-3.5 shrink-0" weight="bold" />
                    )}
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
