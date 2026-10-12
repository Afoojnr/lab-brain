import type { useFormatter } from 'next-intl';

import {
  formatDerivedValue,
  formatParameterValue
} from '@/features/experiments/shared';
import type { ParameterValue } from '@/features/experiments/shared';

type Formatter = ReturnType<typeof useFormatter>;

/**
 * A recorded value as text, or the "not recorded" placeholder. A missing value
 * is never shown as 0 or blank, so a report cannot be read as "measured: 0".
 */
export const valueText = (
  format: Formatter,
  value: ParameterValue | undefined,
  notRecorded: string
): string =>
  value === undefined ? notRecorded : formatParameterValue(format, value);

/** A calculated value as text, or the placeholder when it cannot be calculated. */
export const calculatedText = (
  format: Formatter,
  value: number | null | undefined,
  notRecorded: string
): string =>
  value === null || value === undefined
    ? notRecorded
    : formatDerivedValue(format, value);
