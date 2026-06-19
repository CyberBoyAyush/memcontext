"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AnimatedTab<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface AnimatedTabsProps<T extends string> {
  tabs: AnimatedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Visual size preset for the tab strip. */
  size?: "sm" | "md";
  /** Container alignment within parent (only affects flex layout). */
  align?: "start" | "center";
  /** Optional className for the outer container. */
  className?: string;
  /** ARIA label for the tab group. */
  ariaLabel?: string;
  /** Capitalize tab labels (used by context vault for "hybrid"/"documents"/etc.). */
  capitalize?: boolean;
}

/**
 * Reusable animated tabs / segmented control.
 *
 * Uses a sliding pill indicator that animates between active tabs via
 * absolutely-positioned div with transition-all. This is the canonical
 * tab pattern used across the dashboard (MCP, memory graph, context
 * vault, workspaces).
 */
export function AnimatedTabs<T extends string>({
  tabs,
  value,
  onChange,
  size = "md",
  align = "start",
  className,
  ariaLabel,
  capitalize,
}: AnimatedTabsProps<T>) {
  const tabsRef = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    const activeTab = tabsRef.current.get(value);
    if (!activeTab) return;
    const container = activeTab.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    const next = {
      left: tabRect.left - containerRect.left,
      width: tabRect.width,
    };
    setIndicatorStyle((current) => {
      if (current?.left === next.left && current.width === next.width) {
        return current;
      }
      return next;
    });
  }, [value]);

  const sizeClasses =
    size === "sm"
      ? {
          container: "h-8 p-0.5 gap-0.5 rounded-md",
          button: "h-7 px-2.5 text-[11px] gap-1.5 rounded",
          indicator: "top-0.5 bottom-0.5 rounded",
        }
      : {
          container: "h-9 p-1 gap-0.5 rounded-lg",
          button: "h-7 px-3 text-xs gap-1.5 rounded-md",
          indicator: "top-1 bottom-1 rounded-md",
        };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex items-center border border-border bg-surface-elevated/50",
        sizeClasses.container,
        align === "center" && "justify-center",
        className,
      )}
    >
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute bg-accent shadow-sm transition-all duration-300 ease-out pointer-events-none",
          sizeClasses.indicator,
        )}
        style={{
          left: indicatorStyle?.left ?? 0,
          width: indicatorStyle?.width ?? 0,
          opacity: indicatorStyle ? 1 : 0,
        }}
        aria-hidden
      />

      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              if (el) tabsRef.current.set(tab.value, el);
            }}
            type="button"
            aria-pressed={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center font-medium transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              sizeClasses.button,
              capitalize && "capitalize",
              isActive
                ? "text-white [&_svg]:fill-white [&_svg]:text-white [&_svg_*]:fill-white"
                : "text-foreground-muted hover:text-foreground [&_svg]:fill-foreground-muted [&_svg]:text-foreground-muted [&_svg_*]:fill-foreground-muted hover:[&_svg]:fill-foreground hover:[&_svg]:text-foreground hover:[&_svg_*]:fill-foreground",
            )}
          >
            {tab.icon && (
              <span className="flex items-center justify-center w-4 h-4 [&_svg]:w-4 [&_svg]:h-4 shrink-0">
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
