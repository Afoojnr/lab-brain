import { useSyncExternalStore } from 'react';

const KEY = 'lab-brain:tours';

type TourState = {
  /** Tours already shown (or declined), so they are not offered again. */
  seen: string[];
  /** The user turned the tours off. */
  isOff: boolean;
};

const NOTHING_SEEN: TourState = { seen: [], isOff: false };

const listeners = new Set<() => void>();
// Kept in memory too, so the choice holds for the visit when storage is blocked.
let memory: TourState | null = null;
let cachedRaw: string | null = null;
let cachedState: TourState = NOTHING_SEEN;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const parse = (raw: string | null): TourState => {
  if (!raw) return NOTHING_SEEN;

  try {
    const value: Partial<TourState> = JSON.parse(raw);

    return {
      seen: Array.isArray(value.seen)
        ? value.seen.filter(item => typeof item === 'string')
        : [],
      isOff: value.isOff === true
    };
  } catch {
    return NOTHING_SEEN;
  }
};

const read = (): TourState => {
  if (memory) return memory;

  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return NOTHING_SEEN;
  }
  // The same object for the same text, as `useSyncExternalStore` requires.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parse(raw);
  }

  return cachedState;
};

const write = (next: TourState) => {
  memory = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage is unavailable; the choice lasts until the page is reloaded.
  }
  for (const listener of listeners) listener();
};

/** Forgets what was seen (the in-memory copy and storage). For tests. */
export const clearTourState = () => {
  memory = null;
  cachedRaw = null;
  cachedState = NOTHING_SEEN;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
};

/**
 * Which guided tours were seen, and whether the user turned them off. Kept in
 * the browser, so it works on the public demo with no accounts, and quietly
 * forgets when storage is blocked. Nothing is read during the server render.
 */
export const useTourState = () => {
  const state = useSyncExternalStore(subscribe, read, () => NOTHING_SEEN);

  return {
    ...state,
    markSeen: (id: string) => {
      const current = read();
      if (current.seen.includes(id)) return;

      write({ ...current, seen: [...current.seen, id] });
    },
    turnOff: () => write({ ...read(), isOff: true }),
    reset: () => write(NOTHING_SEEN)
  };
};
