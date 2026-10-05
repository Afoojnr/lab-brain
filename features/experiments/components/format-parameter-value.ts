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
