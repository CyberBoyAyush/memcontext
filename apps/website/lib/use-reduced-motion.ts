"use client";

import { useSyncExternalStore } from "react";

/**
 * Get the current reduced motion preference
 */
function getReducedMotionPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Subscribe to reduced motion preference changes
 */
function subscribeToReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);

  return () => {
    mediaQuery.removeEventListener("change", callback);
  };
}

/**
 * Server snapshot always returns false (no reduced motion by default)
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook to detect if user prefers reduced motion
 * Respects system accessibility preferences
 * Uses useSyncExternalStore for proper React 18+ integration
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionPreference,
    getServerSnapshot,
  );
}
