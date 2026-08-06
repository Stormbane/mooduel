// Thin storage abstraction (spec §10.1) — swappable for Capacitor Preferences.

export interface KVStore {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

const PREFIX = "nsi:";

export const localStore: KVStore = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* storage full or unavailable — the game must keep working */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};

/** In-memory store for tests. */
export function memoryStore(): KVStore {
  const m = new Map<string, string>();
  return {
    get: <T>(k: string) => (m.has(k) ? (JSON.parse(m.get(k)!) as T) : null),
    set: (k, v) => void m.set(k, JSON.stringify(v)),
    remove: (k) => void m.delete(k),
  };
}
