import { columnLabel } from './column-label';
import type { GroupBy, PlotColumn } from '../types';

/**
 * What a legend's entries are: the column the colours are by (with its unit),
 * or the study. Undefined when the plot is not grouped.
 *
 * @param group - How the plot is grouped.
 * @param columns - The table's columns.
 * @param studyLabel - The translated word for "Study".
 */
export const legendTitleFor = (
  group: GroupBy,
  columns: PlotColumn[],
  studyLabel: string
): string | undefined => {
  if (group.type === 'study') return studyLabel;
  if (group.type === 'none') return undefined;

  const column = columns.find(item => item.key === group.key);

  return column ? columnLabel(column) : undefined;
};
