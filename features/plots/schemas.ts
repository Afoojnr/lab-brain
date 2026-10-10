import { z } from 'zod';

import type { PlotColumn } from './types';

/** Keys under `plots.save.errors` in `messages/<locale>/plots.json`. */
export const SAVED_PLOT_FORM_ERRORS = [
  'nameRequired',
  'nameTooLong',
  'nameDuplicate'
] as const;

export type SavedPlotFormError = (typeof SAVED_PLOT_FORM_ERRORS)[number];

export const SAVED_PLOT_NAME_MAX_LENGTH = 80;
const MAX_FILTERS = 50;
const MAX_FILTER_VALUES = 500;
const MAX_UNTICKED = 5000;

/**
 * The title asked for when saving a plot. The title must be unique within the
 * experiment, ignoring case.
 *
 * @param otherNames - Titles of the experiment's other saved plots.
 */
export const buildSavedPlotFormSchema = (otherNames: string[]) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: 'nameRequired' satisfies SavedPlotFormError })
      .max(SAVED_PLOT_NAME_MAX_LENGTH, {
        error: 'nameTooLong' satisfies SavedPlotFormError
      })
      .refine(
        name =>
          !otherNames.some(other => other.toLowerCase() === name.toLowerCase()),
        { error: 'nameDuplicate' satisfies SavedPlotFormError }
      )
  });

export type SavedPlotFormValues = z.infer<
  ReturnType<typeof buildSavedPlotFormSchema>
>;

/** Narrows a Zod error message to a known translation key. */
export const isSavedPlotFormError = (
  message: string | undefined
): message is SavedPlotFormError =>
  SAVED_PLOT_FORM_ERRORS.some(error => error === message);

const GROUP_SCHEMA = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('study') }),
  z.object({ type: z.literal('column'), key: z.string().max(200) })
]);

const SIZE_SCHEMA = z.enum(['small', 'medium', 'large']);

const STYLE_SCHEMA = z.object({
  xMin: z.string().max(40),
  xMax: z.string().max(40),
  yMin: z.string().max(40),
  yMax: z.string().max(40),
  title: z.string().max(200),
  xTitle: z.string().max(200),
  yTitle: z.string().max(200),
  textSize: SIZE_SCHEMA,
  markerSize: SIZE_SCHEMA,
  showGrid: z.boolean(),
  showSource: z.boolean(),
  showCounts: z.boolean()
});

const FILTER_SCHEMA = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('values'),
    key: z.string().max(200),
    values: z
      .array(z.union([z.number().finite(), z.string().max(500)]))
      .max(MAX_FILTER_VALUES)
  }),
  z.object({
    type: z.literal('range'),
    key: z.string().max(200),
    min: z.string().max(40),
    max: z.string().max(40)
  })
]);

/**
 * The payload of the save action: the title plus what to plot. Rebuilt on the
 * server from the experiment's stored columns, so a saved plot can only point
 * at columns the experiment has.
 *
 * @param columns - The experiment's plottable columns.
 * @param otherNames - Titles of the experiment's other saved plots.
 */
export const buildSavedPlotSchema = (
  columns: Pick<PlotColumn, 'key' | 'kind'>[],
  otherNames: string[]
) => {
  const numbers = new Set(
    columns.filter(column => column.kind === 'number').map(item => item.key)
  );
  const all = new Set(columns.map(column => column.key));

  return buildSavedPlotFormSchema(otherNames).extend({
    settings: z
      .object({
        x: z.string().max(200),
        y: z.string().max(200),
        error: z.string().max(200).nullable(),
        group: GROUP_SCHEMA,
        logX: z.boolean(),
        logY: z.boolean()
      })
      .superRefine((settings, context) => {
        const problems: [string, boolean][] = [
          ['x', numbers.has(settings.x)],
          ['y', numbers.has(settings.y)],
          ['error', settings.error === null || numbers.has(settings.error)],
          [
            'group',
            settings.group.type !== 'column' || all.has(settings.group.key)
          ]
        ];
        for (const [path, isValid] of problems) {
          if (!isValid) {
            context.addIssue({
              code: 'custom',
              path: [path],
              message: 'unknown'
            });
          }
        }
      }),
    filters: z
      .array(FILTER_SCHEMA)
      .max(MAX_FILTERS)
      .refine(
        filters =>
          filters.every(filter =>
            filter.type === 'range'
              ? numbers.has(filter.key)
              : all.has(filter.key)
          ),
        { error: 'unknown' }
      ),
    untickedIds: z.array(z.string().max(100)).max(MAX_UNTICKED),
    style: STYLE_SCHEMA
  });
};
