"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "memcontext_referrer";
const ACCEPTED_REFERRERS = ["twitter", "x", "peerlist", "linkedin"] as const;
const STORED_REFERRERS = ["twitter", "peerlist", "linkedin"] as const;

type AcceptedReferrer = (typeof ACCEPTED_REFERRERS)[number];
type StoredReferrer = (typeof STORED_REFERRERS)[number];

function isAcceptedReferrer(value: string): value is AcceptedReferrer {
  return ACCEPTED_REFERRERS.includes(value as AcceptedReferrer);
}

function isStoredReferrer(value: string): value is StoredReferrer {
  return STORED_REFERRERS.includes(value as StoredReferrer);
}

function normalizeReferrer(ref: AcceptedReferrer): StoredReferrer {
  if (ref === "x") return "twitter";
  return ref as StoredReferrer;
}

function getInitialReferrer(): StoredReferrer | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isStoredReferrer(stored)) {
    return stored;
  }

  const params = new URLSearchParams(window.location.search);
  const refParam = params.get("ref") || params.get("utm_source");

  if (refParam && isAcceptedReferrer(refParam)) {
    const normalized = normalizeReferrer(refParam);
    localStorage.setItem(STORAGE_KEY, normalized);
    return normalized;
  }

  return null;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): StoredReferrer | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isStoredReferrer(stored)) {
    return stored;
  }
  return null;
}

function getServerSnapshot(): StoredReferrer | null {
  return null;
}

export function useReferrer() {
  const [initialized, setInitialized] = useState(false);

  const storedReferrer = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const referrer = initialized ? storedReferrer : null;

  if (typeof window !== "undefined" && !initialized) {
    const initial = getInitialReferrer();
    if (initial && !storedReferrer) {
      localStorage.setItem(STORAGE_KEY, initial);
    }
    setInitialized(true);
  }

  const clearReferrer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { referrer, clearReferrer };
}
