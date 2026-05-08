"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Per-game localStorage-backed session state. Survives refresh,
 * resets on explicit `clear()` call.
 *
 * Keyed under `mooduel:session:{game}`. Versioned payloads: bump
 * `version` when the shape changes to invalidate old sessions.
 */
export function useGameSession<T>(game: string, initial: T, version = 1) {
  const storageKey = `mooduel:session:${game}`;
  const hasHydrated = useRef(false);
  const [state, setState] = useState<T>(initial);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { v: number; data: T };
      if (parsed.v === version) {
        setState(parsed.data);
      }
    } catch {
      // Ignore malformed storage
    }
  }, [storageKey, version]);

  // Persist on change (after initial hydration)
  useEffect(() => {
    if (!hasHydrated.current) return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ v: version, data: state }),
      );
    } catch {
      // Ignore quota errors
    }
  }, [storageKey, version, state]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
    setState(initial);
  }, [storageKey, initial]);

  return [state, setState, clear] as const;
}
