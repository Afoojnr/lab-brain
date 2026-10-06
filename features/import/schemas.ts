import { z } from 'zod';

import { MAX_ROWS } from './limits';

const text = (max: number) => z.string().max(max);

const columnTargetSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ignore') }),
  z.object({ type: z.literal('code') }),
  z.object({ type: z.literal('date') }),
  z.object({ type: z.literal('implementation') }),
  z.object({ type: z.literal('observation') }),
  z.object({ type: z.literal('note') }),
  z.object({ type: z.literal('studies') }),
  z.object({ type: z.literal('column'), columnId: text(100) }),
  z.object({
    type: z.literal('newColumn'),
    name: text(200),
    unit: text(200),
    kind: z.enum(['number', 'text']),
    role: z.enum(['parameter', 'result'])
  })
]);

const choiceSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update') }),
  z.object({ action: z.literal('skip') }),
  z.object({ action: z.literal('addAsNew'), code: text(200) })
]);

/**
 * The shape of an import sent to the server: plain strings and numbers only.
 * It only guards the shape; the values themselves are checked by
 * `validateImport`, the same function the preview uses.
 */
export const importPayloadSchema = z.object({
  target: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('new'),
      name: text(200),
      codePrefix: text(20),
      protocol: text(5000)
    }),
    z.object({ type: z.literal('existing'), experimentId: text(100) })
  ]),
  headers: z.array(text(500)).max(500),
  mapping: z.array(columnTargetSchema).max(500),
  dateFormat: z.enum(['iso', 'dmy', 'mdy']),
  rows: z
    .array(
      z.object({
        sheetRow: z.number().int().positive(),
        cells: z.array(text(5000)).max(500),
        comments: z.record(z.string(), text(5000))
      })
    )
    .max(MAX_ROWS),
  choices: z.record(z.string(), choiceSchema),
  shouldSkipErrorRows: z.boolean()
});
