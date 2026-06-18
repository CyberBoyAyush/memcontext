"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom";
  /** Distance in px between the trigger and the tooltip. */
  offset?: number;
  className?: string;
  /** Disable opening (e.g. while loading). */
  disabled?: boolean;
}

/**
 * Lightweight, portal-rendered tooltip with a triangular tip and
 * high-contrast inverted styling so it stays readable on any background.
 *
 * Rendered in a portal so ancestor `overflow-hidden` containers (cards,
 * tables, modals) never clip it. The trigger is wrapped in a
 * `display: contents` span which captures hover/focus events without
 * affecting layout.
 */
export function Tooltip({
  content,
  children,
  side = "bottom",
  offset = 8,
  className,
  disabled,
}: TooltipProps) {
  const [hovered, setHovered] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, tipLeft: 0 });
  const open = hovered && !disabled;

  const update = useCallback(() => {
    const wrapper = wrapperRef.current;
    const tooltip = tooltipRef.current;
    if (!wrapper || !tooltip) return;

    // Anchor on the first element child so a `display: contents` wrapper
    // can host the listeners without affecting layout.
    const anchor =
      (wrapper.firstElementChild as HTMLElement | null) ?? wrapper;
    const triggerRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 8;
    const viewportW = window.innerWidth;

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    let left = triggerCenterX - tooltipRect.width / 2;
    left = Math.max(
      margin,
      Math.min(left, viewportW - tooltipRect.width - margin),
    );

    const top =
      side === "bottom"
        ? triggerRect.bottom + offset
        : triggerRect.top - tooltipRect.height - offset;

    // Tip position relative to the tooltip's own left edge so it always
    // points at the centre of the trigger even when we clamp horizontally.
    const tipLeft = Math.max(
      8,
      Math.min(triggerCenterX - left, tooltipRect.width - 8),
    );

    setCoords({ top, left, tipLeft });
  }, [offset, side]);

  useLayoutEffect(() => {
    if (!open) return;
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return (
    <>
      <span
        ref={wrapperRef}
        style={{ display: "contents" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {children}
      </span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className={cn(
              "pointer-events-none fixed z-[100] whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium shadow-xl",
              // High-contrast inverted palette: light pill on dark themes,
              // dark pill on light themes.
              "bg-foreground text-background",
              "animate-fade-in",
              className,
            )}
          >
            {content}
            <span
              aria-hidden
              style={{ left: coords.tipLeft }}
              className={cn(
                "absolute h-2 w-2 -translate-x-1/2 rotate-45 bg-foreground",
                side === "bottom" ? "-top-1" : "-bottom-1",
              )}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
