import type { ParameterDefinition } from '@/features/experiments/shared';

import { newColumnFromHeader } from '../../build-payload';
import type { ColumnTarget } from '../../types';

/** The select's value for a target: `column:<id>` for an existing column, else the target's type. */
export const targetToValue = (target: ColumnTarget): string =>
  target.type === 'column' ? `column:${target.columnId}` : target.type;

const FIELD_TYPES = [
  'ignore',
  'code',
  'date',
  'implementation',
  'observation',
  'note',
  'studies'
] as const;

/**
 * The target a select value stands for. Choosing "new column" prefills its
 * name and unit from the header.
 *
 * @param value - A value from {@link targetToValue}.
 * @param header - The source column's header.
 * @param unit - A unit from the units row, if any.
 * @param columns - The experiment's columns, to check an existing one.
 * @param kind - The kind suggested for a new column, from the cells.
 */
export const valueToTarget = (
  value: string,
  header: string,
  unit: string,
  columns: Pick<ParameterDefinition, 'id'>[],
  kind: 'number' | 'text'
): ColumnTarget => {
  if (value.startsWith('column:')) {
    const columnId = value.slice('column:'.length);
    if (columns.some(column => column.id === columnId)) {
      return { type: 'column', columnId };
    }
  }
  if (value === 'newColumn') {
    return {
      type: 'newColumn',
      ...newColumnFromHeader(header, unit),
      kind,
      role: 'parameter'
    };
  }

  const field = FIELD_TYPES.find(type => type === value);

  return { type: field ?? 'ignore' } as ColumnTarget;
};
