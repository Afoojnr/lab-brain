import { parseDecimal } from '@/lib/numbers/numbers';

import type {
  ParameterDefinition,
  ParameterKind,
  ParameterValue,
  ParameterValues,
  Sample
} from '../types';

/**
 * Doubles hold about 15 reliable digits, so show up to 15 significant digits:
 * enough that a recorded value is never silently rounded on screen.
 */
export const NUMBER_FORMAT_OPTIONS = { maximumSignificantDigits: 15 } as const;

export type ParsedParameter =
  { isValid: true; value: ParameterValue | undefined } | { isValid: false };

/**
 * Reads one typed-in value for a parameter. Text in a number parameter is
 * invalid, never coerced to `NaN` or `0`.
 */
export const parseParameterInput = (
  raw: string,
  kind: ParameterKind
): ParsedParameter => {
  const trimmed = raw.trim();
  if (trimmed === '') return { isValid: true, value: undefined };
  if (kind === 'text') return { isValid: true, value: trimmed };

  const value = parseDecimal(trimmed);
  return value === null ? { isValid: false } : { isValid: true, value };
};

/**
 * Parses every typed-in value of one sample against its experiment's parameters.
 * Keys that match no parameter are ignored.
 */
export const parseParameterInputs = (
  definitions: ParameterDefinition[],
  inputs: Record<string, string>
): { values: ParameterValues; invalidIds: string[] } => {
  const values: ParameterValues = {};
  const invalidIds: string[] = [];

  for (const definition of definitions) {
    const parsed = parseParameterInput(
      inputs[definition.id] ?? '',
      definition.kind
    );
    if (!parsed.isValid) invalidIds.push(definition.id);
    else if (parsed.value !== undefined) values[definition.id] = parsed.value;
  }

  return { values, invalidIds };
};

/** Format options for a stored calendar date: read in UTC so it never shifts a day. */
/**
 * Whether a `YYYY-MM-DD` string is a real calendar date, so "2026-02-30" is
 * rejected instead of silently rolling over to March.
 */
export const isCalendarDate = (value: string): boolean => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

export const CALENDAR_DATE_FORMAT = {
  dateStyle: 'medium',
  timeZone: 'UTC'
} as const;

/**
 * A stored `YYYY-MM-DD` date as a `Date` at midnight UTC. Pair it with
 * {@link CALENDAR_DATE_FORMAT} so a date never shifts a day for someone west
 * of Greenwich.
 */
export const toCalendarDate = (value: string): Date =>
  new Date(`${value}T00:00:00Z`);

/**
 * The next sample code in an experiment: the prefix plus one more than the highest
 * number already used, zero-padded to 3 digits (ALD251 after ALD250). Codes
 * that are not exactly prefix + digits, like `ALD023_Annealing` typed by hand, are ignored.
 */
export const suggestNextSampleCode = (
  codePrefix: string,
  existingCodes: string[]
): string => {
  const pattern = new RegExp(`^${codePrefix}(\\d+)$`, 'i');
  const numbers = existingCodes
    .map(code => pattern.exec(code.trim())?.[1])
    .filter((digits): digits is string => digits !== undefined)
    .map(Number);
  const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1;

  return `${codePrefix}${String(next).padStart(3, '0')}`;
};

/** One empty input per parameter, so every form cell starts controlled. */
export const emptyInputs = (
  definitions: ParameterDefinition[]
): Record<string, string> =>
  Object.fromEntries(definitions.map(definition => [definition.id, '']));

/**
 * Prefills a new sample's inputs: results stay empty, a parameter's own default
 * wins, otherwise the previous sample's value is used. Values are copied into
 * the sample, so changing a default later never touches recorded samples.
 */
export const defaultSampleInputs = (
  definitions: ParameterDefinition[],
  previous: Pick<Sample, 'values'> | undefined
): Record<string, string> =>
  Object.fromEntries(
    definitions.map(definition => {
      const value =
        definition.role === 'result'
          ? undefined
          : (definition.defaultValue ?? previous?.values[definition.id]);
      return [definition.id, value === undefined ? '' : String(value)];
    })
  );

/**
 * Typed-in inputs for duplicating a sample: its parameters are copied, but its
 * results are left empty, because they were measured on the original.
 */
export const duplicateSampleInputs = (
  definitions: ParameterDefinition[],
  sample: Pick<Sample, 'values'>
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(sampleToInputs(definitions, sample)).map(([id, text]) => [
      id,
      definitions.find(definition => definition.id === id)?.role === 'result'
        ? ''
        : text
    ])
  );

/** Typed-in inputs for an existing sample, for duplicating or editing it. */
export const sampleToInputs = (
  definitions: ParameterDefinition[],
  sample: Pick<Sample, 'values'>
): Record<string, string> =>
  Object.fromEntries(
    definitions.map(definition => {
      const value = sample.values[definition.id];
      return [definition.id, value === undefined ? '' : String(value)];
    })
  );
