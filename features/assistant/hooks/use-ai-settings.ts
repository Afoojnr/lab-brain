'use client';

import { useSyncExternalStore } from 'react';

import { aiSettingsSchema, DEFAULT_AI_SETTINGS } from '../ai/settings';
import type { AiSettings } from '../ai/settings';

const STORAGE_KEY = 'lab-brain:ai-settings';

const listeners = new Set<() => void>();
// Kept in memory too, so the settings still work when storage is blocked.
let memory: string | null | undefined;
let cachedRaw: string | null = null;
let cached: AiSettings = DEFAULT_AI_SETTINGS;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const readRaw = (): string | null => {
  if (memory !== undefined) return memory;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const parse = (raw: string | null): AiSettings => {
  if (raw === null) return DEFAULT_AI_SETTINGS;
  try {
    const parsed = aiSettingsSchema.safeParse(JSON.parse(raw));

    return parsed.success ? parsed.data : DEFAULT_AI_SETTINGS;
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
};

// The same object until the stored text changes, as React requires.
const getSnapshot = (): AiSettings => {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }

  return cached;
};

/** Forgets the saved settings (the in-memory copy and storage). For tests. */
export const clearAiSettings = () => {
  memory = undefined;
  cachedRaw = null;
  cached = DEFAULT_AI_SETTINGS;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
  for (const listener of listeners) listener();
};

/**
 * The user's AI settings, kept in this browser only, with a function to save
 * them. The key never goes to the server except with a question. Server and
 * first client render agree because storage is only read after hydration.
 */
export const useAiSettings = () => {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => DEFAULT_AI_SETTINGS
  );

  const save = (next: AiSettings) => {
    memory = JSON.stringify(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, memory);
    } catch {
      // Storage is unavailable; the settings last until the page is reloaded.
    }
    for (const listener of listeners) listener();
  };

  return [settings, save] as const;
};
