import { describe, expect, it } from 'vitest';

import { calculatedText, valueText } from './format';

// A minimal stand-in for next-intl's formatter.
const format = {
  number: (value: number) => String(value)
} as unknown as Parameters<typeof valueText>[0];

describe('valueText', () => {
  it('shows the placeholder for a missing value, never 0', () => {
    expect(valueText(format, undefined, 'Not recorded')).toBe('Not recorded');
  });

  it('shows a recorded 0 as 0, and text as typed', () => {
    expect(valueText(format, 0, 'Not recorded')).toBe('0');
    expect(valueText(format, 'silicon', 'Not recorded')).toBe('silicon');
  });
});

describe('calculatedText', () => {
  it('shows the placeholder when it cannot be calculated', () => {
    expect(calculatedText(format, null, 'Not recorded')).toBe('Not recorded');
    expect(calculatedText(format, undefined, 'Not recorded')).toBe(
      'Not recorded'
    );
  });

  it('shows a calculated 0 as 0', () => {
    expect(calculatedText(format, 0, 'Not recorded')).toBe('0');
  });
});
