import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
// Kept in memory too, so a group still opens and closes when storage is blocked.
const memory = new Map<string, string>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const read = (key: string): string | null => {
  const inMemory = memory.get(key);
  if (inMemory !== undefined) return inMemory;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Forgets every remembered choice (the in-memory copy and storage). For tests. */
export const clearPersistentOpen = () => {
  memory.clear();
  try {
    window.localStorage.clear();
  } catch {
    // Nothing stored.
  }
};

/**
 * Whether a collapsible group is open, remembered between visits. Until the
 * user opens or closes it, `defaultOpen` decides (for example, the group that
 * holds the page you are on). Works without storage (private window, blocked
 * site data): it just forgets on reload. Server and first client render agree
 * because the stored value is only read after hydration.
 *
 * @param key - Where the choice is kept.
 * @param defaultOpen - Whether it is open before the user chooses.
 */
export const usePersistentOpen = (key: string, defaultOpen: boolean) => {
  const stored = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null
  );

  const setIsOpen = (isOpen: boolean) => {
    memory.set(key, String(isOpen));
    try {
      window.localStorage.setItem(key, String(isOpen));
    } catch {
      // Storage is unavailable; the choice lasts until the page is reloaded.
    }
    for (const listener of listeners) listener();
  };

  return [
    stored === null ? defaultOpen : stored === 'true',
    setIsOpen
  ] as const;
};
