import { describe, expect, it } from 'vitest';

import { isLocale, LOCALES } from './config';

describe('isLocale', () => {
  it('accepts a supported language', () => {
    for (const locale of LOCALES) {
      expect(isLocale(locale)).toBe(true);
    }
  });
  it.each(['xx', '', 'en-US'])('rejects %j', code => {
    expect(isLocale(code)).toBe(false);
  });

  it('rejects a missing value, like a cookie that was never set', () => {
    expect(isLocale(undefined)).toBe(false);
  });
});
