"use client";

import { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function SkeletonProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const mounted = useIsMounted();

  // Default to dark theme colors before mount to prevent flash
  const baseColor =
    mounted && resolvedTheme === "light" ? "#e5e7eb" : "#262626";
  const highlightColor =
    mounted && resolvedTheme === "light" ? "#f3f4f6" : "#333333";

  return (
    <SkeletonTheme
      baseColor={baseColor}
      highlightColor={highlightColor}
      borderRadius={12}
      duration={1.8}
    >
      {children}
    </SkeletonTheme>
  );
}
