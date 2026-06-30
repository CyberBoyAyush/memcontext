"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  workspacesQueryOptions,
  type Workspace,
} from "@/lib/queries/context-vault";

interface WorkspaceContextType {
  activeWorkspace: Workspace | undefined;
  activeWorkspaceId: string;
  isLoading: boolean;
  setActiveWorkspaceId: (workspaceId: string) => void;
  workspaces: Workspace[];
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "memcontext-active-workspace";

let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

function getServerSnapshot() {
  return "";
}

function setStorageValue(workspaceId: string) {
  localStorage.setItem(STORAGE_KEY, workspaceId);
  listeners.forEach((listener) => listener());
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery(workspacesQueryOptions());
  const workspaces = useMemo(() => data?.workspaces ?? [], [data?.workspaces]);
  const storedWorkspaceId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === storedWorkspaceId) ??
    workspaces[0];
  const activeWorkspaceId = activeWorkspace?.id ?? "";

  useEffect(() => {
    if (activeWorkspaceId && storedWorkspaceId !== activeWorkspaceId) {
      setStorageValue(activeWorkspaceId);
    }
  }, [activeWorkspaceId, storedWorkspaceId]);

  const setActiveWorkspaceId = useCallback((workspaceId: string) => {
    setStorageValue(workspaceId);
  }, []);

  const value = useMemo(
    () => ({
      activeWorkspace,
      activeWorkspaceId,
      isLoading,
      setActiveWorkspaceId,
      workspaces,
    }),
    [
      activeWorkspace,
      activeWorkspaceId,
      isLoading,
      setActiveWorkspaceId,
      workspaces,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
