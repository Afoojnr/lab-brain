import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { clearTourState, useTourState } from './use-tour-state';

afterEach(clearTourState);

describe('useTourState', () => {
  it('starts with nothing seen and tours on', () => {
    const { result } = renderHook(() => useTourState());

    expect(result.current.seen).toEqual([]);
    expect(result.current.isOff).toBe(false);
  });

  it('remembers a seen tour once, across hooks and reloads', () => {
    const { result } = renderHook(() => useTourState());

    act(() => {
      result.current.markSeen('home');
      result.current.markSeen('home');
    });

    expect(result.current.seen).toEqual(['home']);
    expect(window.localStorage.getItem('lab-brain:tours')).toBe(
      JSON.stringify({ seen: ['home'], isOff: false })
    );
  });

  it('turns tours off', () => {
    const { result } = renderHook(() => useTourState());

    act(() => result.current.turnOff());

    expect(result.current.isOff).toBe(true);
  });

  it('ignores damaged stored text', () => {
    window.localStorage.setItem('lab-brain:tours', '{not json');
    const { result } = renderHook(() => useTourState());

    expect(result.current.seen).toEqual([]);
    expect(result.current.isOff).toBe(false);
  });

  it('keeps working for the visit when storage throws', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
    const { result } = renderHook(() => useTourState());

    act(() => result.current.markSeen('project'));
    Storage.prototype.setItem = original;

    expect(result.current.seen).toEqual(['project']);
  });
});
