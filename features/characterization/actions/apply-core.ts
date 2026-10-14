import { createParameterDefinition } from '@/features/experiments/server';
import { buildParameterFormSchema } from '@/features/experiments/shared';
import type { ParameterDefinition } from '@/features/experiments/shared';

import type { AnalysisSettings, AnalysisValue } from '../types';

/** Where one chosen value goes: an existing result column, or a new one to create. */
export type TargetPlanItem = {
  valueId: string;
  columnId?: string;
  newColumn?: { name: string; unit: string };
};

/**
 * Checks where the chosen values go, before anything is written: every value
 * must be one the analysis produces, every target an existing number result
 * column (used once) or a new result column with a valid, unused name.
 */
export const planTargets = (
  selectedValueIds: string[],
  targets: AnalysisSettings['targets'],
  availableValueIds: string[],
  definitions: ParameterDefinition[]
): TargetPlanItem[] | null => {
  if (selectedValueIds.length === 0) return null;

  const names = definitions.map(definition => definition.name);
  const plan: TargetPlanItem[] = [];
  const usedColumns = new Set<string>();

  for (const valueId of selectedValueIds) {
    const target = targets[valueId];
    if (!availableValueIds.includes(valueId) || !target) return null;

    if (target.type === 'column') {
      const column = definitions.find(
        definition => definition.id === target.columnId
      );
      if (!column || column.role !== 'result' || column.kind !== 'number') {
        return null;
      }
      if (usedColumns.has(column.id)) return null;
      usedColumns.add(column.id);
      plan.push({ valueId, columnId: column.id });
      continue;
    }

    const form = buildParameterFormSchema(names).safeParse({
      name: target.name,
      unit: target.unit,
      kind: 'number',
      role: 'result',
      defaultValue: ''
    });
    if (!form.success) return null;
    names.push(form.data.name);
    plan.push({
      valueId,
      newColumn: { name: form.data.name, unit: form.data.unit }
    });
  }

  return plan;
};

/** The numbers to write for a plan, taken from values the server computed. */
export const numbersFor = (
  plan: TargetPlanItem[],
  values: AnalysisValue[]
): Map<string, number> | null => {
  const numbers = new Map<string, number>();

  for (const item of plan) {
    const value = values.find(
      candidate => candidate.id === item.valueId
    )?.value;
    if (value === undefined || !Number.isFinite(value)) return null;
    numbers.set(item.valueId, value);
  }

  return numbers;
};

/**
 * Creates the plan's new result columns (once) and says which column each value
 * goes to.
 */
export const createPlannedColumns = async (
  experimentId: string,
  plan: TargetPlanItem[]
): Promise<Map<string, string>> => {
  const columnIds = new Map<string, string>();

  for (const item of plan) {
    columnIds.set(
      item.valueId,
      item.columnId ??
        (
          await createParameterDefinition(experimentId, {
            name: item.newColumn?.name ?? '',
            unit: item.newColumn?.unit ?? '',
            kind: 'number',
            role: 'result',
            defaultValue: null
          })
        ).id
    );
  }

  return columnIds;
};
