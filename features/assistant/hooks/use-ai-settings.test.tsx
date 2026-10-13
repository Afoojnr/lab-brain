import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AI_SETTINGS } from '../ai/settings';
import { clearAiSettings, useAiSettings } from './use-ai-settings';

afterEach(() => {
  vi.restoreAllMocks();
  clearAiSettings();
});

describe('useAiSettings', () => {
  it('starts with the defaults and keeps what is saved, in this browser', () => {
    const { result } = renderHook(() => useAiSettings());
    expect(result.current[0]).toEqual(DEFAULT_AI_SETTINGS);

    act(() =>
      result.current[1]({
        ...DEFAULT_AI_SETTINGS,
        apiKey: 'sk-test',
        model: 'm1'
      })
    );

    expect(result.current[0]).toMatchObject({ apiKey: 'sk-test', model: 'm1' });
    expect(window.localStorage.getItem('lab-brain:ai-settings')).toContain(
      'sk-test'
    );
  });

  it('falls back to the defaults for stored text that is not valid settings', () => {
    window.localStorage.setItem('lab-brain:ai-settings', '{"provider":"nope"}');
    clearAiSettingsKeepStorage();

    const { result } = renderHook(() => useAiSettings());

    expect(result.current[0]).toEqual(DEFAULT_AI_SETTINGS);
  });

  it('still works when storage is blocked, until the page is reloaded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useAiSettings());

    act(() =>
      result.current[1]({ ...DEFAULT_AI_SETTINGS, apiKey: 'sk-memory' })
    );

    expect(result.current[0].apiKey).toBe('sk-memory');
  });
});

// Re-reads storage as a fresh page would.
function clearAiSettingsKeepStorage() {
  const stored = window.localStorage.getItem('lab-brain:ai-settings');
  clearAiSettings();
  if (stored) window.localStorage.setItem('lab-brain:ai-settings', stored);
}
