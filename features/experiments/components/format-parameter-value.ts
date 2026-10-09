import type { useFormatter } from 'next-intl';

import { NUMBER_FORMAT_OPTIONS } from '../parameters';
import type { ParameterValue } from '../types';

/** The same formatter type comes from `getFormatter` (server) and `useFormatter` (client). */
type Formatter = ReturnType<typeof useFormatter>;

/**
 * A stored value as display text: numbers in the reader's locale (1.5 or 1,5)
 * with enough digits that nothing is rounded on screen, text as typed.
 *
 * @param format - next-intl's formatter.
 * @param value - A stored value.
 */
export const formatParameterValue = (
  format: Formatter,
  value: ParameterValue
): string =>
  typeof value === 'number'
    ? format.number(value, NUMBER_FORMAT_OPTIONS)
    : value;

/**
 * A calculated value as display text: six significant digits in the reader's
 * locale, so floating-point noise such as 8.100000000000001 never shows. It is
 * only a display; the exact value is always recomputed from the stored ones.
 *
 * @param format - next-intl's formatter.
 * @param value - A value from `evaluateFormula`.
 */
export const formatDerivedValue = (format: Formatter, value: number): string =>
  format.number(value, { maximumSignificantDigits: 6 });
