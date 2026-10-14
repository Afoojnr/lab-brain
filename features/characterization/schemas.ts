import { z } from 'zod';

import type { AnalysisSettings } from './types';

const symbol = z.string().trim().min(1).max(10);

const targetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('column'), columnId: z.string().max(100) }),
  z.object({
    type: z.literal('new'),
    name: z.string().max(200),
    unit: z.string().max(200)
  })
]);

export const analysisKindSchema = z.enum(['edx', 'ellipsometry', 'ftir']);

const finite = z.number().finite();
const range = z
  .object({ from: finite, to: finite })
  .refine(item => item.from <= item.to);

/** What the FTIR analysis keeps: choices only, bounded; the server recomputes every number. */
export const ftirSettingsSchema = z.object({
  reading: z.enum(['transmittance', 'absorbance']).nullable(),
  convertToAbsorbance: z.boolean(),
  normalisation: z.object({
    method: z.enum(['none', 'minmax', 'peak', 'vector', 'snv']),
    range: range.nullable(),
    referencePosition: finite.nullable()
  }),
  detection: z.object({
    range: range.nullable(),
    sensitivity: finite.min(0).max(1),
    minSpacing: finite.min(0).max(1000)
  }),
  tolerance: finite.min(0).max(1000),
  offset: finite.min(0).max(10),
  peaks: z
    .array(
      z.object({
        id: z.string().min(1).max(60),
        position: finite,
        label: z.string().max(100)
      })
    )
    .max(50)
});

/**
 * The shape of an analysis's settings sent to the server. It only guards the
 * shape: the server recomputes every number itself and checks each target
 * against the experiment's own columns.
 */
export const analysisSettingsSchema: z.ZodType<AnalysisSettings> = z.object({
  numerator: symbol,
  denominator: symbol,
  excludedSpots: z.array(z.string().max(500)).max(1000),
  datasetId: z.string().max(100).nullable(),
  ftir: ftirSettingsSchema.nullable(),
  selectedValueIds: z.array(z.string().max(60)).max(200),
  targets: z.record(z.string().max(60), targetSchema)
});

/**
 * The shape of a batch sent to the server: the shared choices (ratio, values,
 * where they go) and the characterizations to apply them to, each with the
 * spots left out. The server recomputes every number itself.
 */
export const batchPayloadSchema = z.object({
  settings: analysisSettingsSchema,
  rows: z
    .array(
      z.object({
        characterizationId: z.string().max(100),
        excludedSpots: z.array(z.string().max(500)).max(1000)
      })
    )
    .max(500)
});

export type BatchPayload = z.infer<typeof batchPayloadSchema>;
