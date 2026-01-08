"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  hoverPeek: boolean;
  setHoverPeek: (peek: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = "sidebar-collapsed";

// localStorage subscription for useSyncExternalStore
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

function setStorageValue(value: boolean) {
  localStorage.setItem(STORAGE_KEY, String(value));
  listeners.forEach((listener) => listener());
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [hoverPeek, setHoverPeek] = useState(false);

  const setCollapsed = useCallback((value: boolean) => {
    setStorageValue(value);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ collapsed, setCollapsed, hoverPeek, setHoverPeek }),
    [collapsed, setCollapsed, hoverPeek],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
