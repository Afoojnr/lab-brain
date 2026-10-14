import type { BatchRow } from './batch-types';
import { edxValues } from '../techniques/edx/stats';
import { ellipsometryValues } from '../techniques/ellipsometry/parse';
import type { AnalysisValue, TableAnalysisKind } from '../types';

/** What applying a value would do to a sample's cell: fill it, leave it, or replace a different value. */
export type CellChange = 'fill' | 'same' | 'replace';

/** Compares a value with what the sample holds in the target column. */
export const cellChange = (
  current: number | string | undefined,
  next: number
): CellChange => {
  if (current === undefined) return 'fill';

  return current === next ? 'same' : 'replace';
};

/**
 * Whether a row is updated unless the user says otherwise: only when it would
 * not replace a value that is already there and different. A row that would
 * overwrite something starts as skipped.
 */
export const isAppliedByDefault = (changes: CellChange[]): boolean =>
  !changes.includes('replace');

/**
 * The values an analysis can send, for the shared choice of values and
 * columns (the numbers are placeholders; only ids, labels and units matter).
 */
export const valueDefinitions = (
  kind: TableAnalysisKind,
  ratio: { numerator: string; denominator: string }
): AnalysisValue[] =>
  kind === 'edx'
    ? edxValues([], ratio.numerator, ratio.denominator)
    : ellipsometryValues({
        thickness: { mean: 0, std: 0 },
        n: { mean: 0, std: 0 },
        points: []
      });

/**
 * The values of one row for the current ratio and spots, or null when there is
 * nothing to compute them from (no readable files, or every spot left out).
 */
export const rowValues = (
  row: BatchRow,
  ratio: { numerator: string; denominator: string },
  excludedSpots: string[]
): AnalysisValue[] | null => {
  if (row.edx) {
    const included = row.edx.spots.filter(
      spot => !excludedSpots.includes(spot.id)
    );

    return included.length === 0
      ? null
      : edxValues(included, ratio.numerator, ratio.denominator);
  }

  return row.ellipsometry?.summary
    ? ellipsometryValues(row.ellipsometry.summary)
    : null;
};
