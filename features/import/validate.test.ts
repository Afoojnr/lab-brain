import { describe, expect, it } from 'vitest';

import type {
  ParameterDefinition,
  Sample
} from '@/features/experiments/shared';

import type { ColumnTarget, ImportPayload, ImportRow } from './types';
import { validateImport } from './validate';
import type { ValidationContext } from './validation-types';

const column = (
  id: string,
  name: string,
  kind: 'number' | 'text' = 'number'
): ParameterDefinition => ({
  id,
  experimentId: 'e1',
  name,
  unit: null,
  kind,
  role: 'parameter',
  defaultValue: null,
  position: 0
});

const existingSample = (
  code: string,
  overrides: Partial<Sample> = {}
): Sample => ({
  id: `id-${code}`,
  experimentId: 'e1',
  code,
  performedOn: null,
  values: {},
  implementation: null,
  observation: null,
  note: null,
  studyIds: [],
  createdAt: new Date(0),
  ...overrides
});

const EMPTY_CONTEXT: ValidationContext = {
  otherPrefixes: [],
  columns: [],
  studies: [],
  experimentSamples: [],
  otherCodes: []
};

const row = (
  sheetRow: number,
  cells: string[],
  comments: Record<string, string> = {}
): ImportRow => ({ sheetRow, cells, comments });

const NEW_COLUMN = (name: string, kind: 'number' | 'text' = 'number') =>
  ({
    type: 'newColumn',
    name,
    unit: '',
    kind,
    role: 'parameter'
  }) as ColumnTarget;

const payloadOf = (
  rows: ImportRow[],
  mapping: ColumnTarget[] = [{ type: 'code' }, NEW_COLUMN('Power')],
  overrides: Partial<ImportPayload> = {}
): ImportPayload => ({
  target: { type: 'new', name: 'Deposition', codePrefix: 'ALD', protocol: '' },
  headers: ['Sample', 'Power'],
  mapping,
  dateFormat: 'iso',
  rows,
  choices: {},
  shouldSkipErrorRows: false,
  ...overrides
});

describe('validateImport', () => {
  it('plans new rows and keeps an empty cell as not recorded, never zero', () => {
    const report = validateImport(
      payloadOf([row(2, ['ALD001', '100']), row(3, ['ALD002', ''])]),
      EMPTY_CONTEXT
    );

    expect(report.isReady).toBe(true);
    expect(report.counts.new).toBe(2);
    expect(report.planned[0]?.values).toEqual({ 'new:1': 100 });
    expect(report.planned[1]?.values).toEqual({});
  });

  it('reports text in a number column on the exact row and column', () => {
    const report = validateImport(
      payloadOf([row(14, ['ALD001', 'abc'])]),
      EMPTY_CONTEXT
    );

    expect(report.rows[0]).toMatchObject({
      sheetRow: 14,
      status: 'error',
      issues: [{ column: 1, message: 'valueNotANumber' }]
    });
    expect(report.planned).toHaveLength(0);
    expect(report.isReady).toBe(false);
  });

  it('reads a decimal comma as a number', () => {
    const report = validateImport(
      payloadOf([row(2, ['ALD001', '1,5'])]),
      EMPTY_CONTEXT
    );

    expect(report.planned[0]?.values).toEqual({ 'new:1': 1.5 });
  });

  it('counts blank rows as empty and ignores them', () => {
    const report = validateImport(
      payloadOf([row(2, ['ALD001', '1']), row(3, ['', ''])]),
      EMPTY_CONTEXT
    );

    expect(report.counts).toMatchObject({ new: 1, empty: 1, error: 0 });
    expect(report.isReady).toBe(true);
  });

  it('flags a row without a code, such as a totals line', () => {
    const report = validateImport(
      payloadOf([row(2, ['ALD001', '1']), row(3, ['', '99'])]),
      EMPTY_CONTEXT
    );

    expect(report.rows[1]).toMatchObject({
      status: 'error',
      issues: [{ column: 0, message: 'codeRequired' }]
    });
    expect(report.isReady).toBe(false);
  });

  it('only lets rows with errors go when the user chose to skip them', () => {
    const report = validateImport(
      payloadOf([row(2, ['ALD001', '1']), row(3, ['', '99'])], undefined, {
        shouldSkipErrorRows: true
      }),
      EMPTY_CONTEXT
    );

    expect(report.isReady).toBe(true);
    expect(report.planned.map(sample => sample.code)).toEqual(['ALD001']);
    expect(report.counts.skipped).toBe(1);
  });

  it('marks a code used twice in the file as an error on both rows', () => {
    const report = validateImport(
      payloadOf([row(2, ['ALD001', '1']), row(3, ['ald001', '2'])]),
      EMPTY_CONTEXT
    );

    expect(report.rows.map(r => r.issues[0]?.message)).toEqual([
      'duplicateInFile',
      'duplicateInFile'
    ]);
  });

  it('requires a code column', () => {
    const report = validateImport(
      payloadOf(
        [row(2, ['ALD001', '1'])],
        [{ type: 'ignore' }, NEW_COLUMN('Power')]
      ),
      EMPTY_CONTEXT
    );

    expect(report.setupIssues).toContain('codeNotMapped');
    expect(report.isReady).toBe(false);
  });

  it('rejects mapping two columns to the same field', () => {
    const report = validateImport(
      payloadOf(
        [row(2, ['ALD001', 'x'])],
        [{ type: 'code' }, { type: 'code' }]
      ),
      EMPTY_CONTEXT
    );

    expect(report.setupIssues).toContain('targetUsedTwice');
  });

  it('rejects a new experiment whose prefix is taken', () => {
    const report = validateImport(payloadOf([row(2, ['ALD001', '1'])]), {
      ...EMPTY_CONTEXT,
      otherPrefixes: ['ALD']
    });

    expect(report.targetIssues).toContain('codePrefixDuplicate');
    expect(report.isReady).toBe(false);
  });

  it('rejects two new columns with the same name', () => {
    const report = validateImport(
      payloadOf(
        [row(2, ['ALD001', '1', '2'])],
        [{ type: 'code' }, NEW_COLUMN('Power'), NEW_COLUMN('power')]
      ),
      EMPTY_CONTEXT
    );

    expect(report.columnIssues).toEqual([
      { column: 2, message: 'nameDuplicate' }
    ]);
  });

  describe('a code that already exists', () => {
    const context: ValidationContext = {
      ...EMPTY_CONTEXT,
      columns: [column('c1', 'Power'), column('c2', 'Time')],
      experimentSamples: [
        existingSample('ALD001', {
          values: { c1: 100, c2: 5 },
          note: 'old',
          implementation: 'old text'
        })
      ],
      otherCodes: ['PSL001']
    };
    const target = { type: 'existing', experimentId: 'e1' } as const;
    const mapping: ColumnTarget[] = [
      { type: 'code' },
      { type: 'column', columnId: 'c1' },
      { type: 'column', columnId: 'c2' },
      { type: 'implementation' }
    ];
    const withRows = (
      rows: ImportRow[],
      choices: ImportPayload['choices'] = {}
    ) =>
      payloadOf(rows, mapping, {
        target,
        headers: ['Sample', 'Power', 'Time', 'Implementation'],
        choices
      });

    it('is a conflict that is skipped unless the user chooses otherwise', () => {
      const report = validateImport(
        withRows([row(2, ['ALD001', '200', '', ''])]),
        context
      );

      expect(report.rows[0]).toMatchObject({
        status: 'conflict',
        action: 'skip',
        canUpdate: true
      });
      expect(report.planned).toHaveLength(0);
      expect(report.counts.skipped).toBe(1);
    });

    it('updates only the cells that have a value and never erases', () => {
      const report = validateImport(
        withRows([row(2, ['ALD001', '200', '', ''])], {
          '2': { action: 'update' }
        }),
        context
      );

      expect(report.planned[0]).toMatchObject({
        mode: 'update',
        existingId: 'id-ALD001',
        values: { c1: 200, c2: 5 },
        implementation: 'old text',
        note: 'old'
      });
      expect(report.rows[0]?.changes).toBe(1);
    });

    it('does not let a code in another experiment be updated', () => {
      const report = validateImport(
        withRows([row(2, ['PSL001', '1', '', ''])], {
          '2': { action: 'update' }
        }),
        context
      );

      expect(report.rows[0]).toMatchObject({
        status: 'error',
        canUpdate: false
      });
      expect(report.rows[0]?.issues[0]?.message).toBe('updateNotAllowed');
    });

    it('adds as new under an edited code, which must be free', () => {
      const free = validateImport(
        withRows([row(2, ['ALD001', '1', '', ''])], {
          '2': { action: 'addAsNew', code: 'ALD001b' }
        }),
        context
      );
      const taken = validateImport(
        withRows([row(2, ['ALD001', '1', '', ''])], {
          '2': { action: 'addAsNew', code: 'ald001' }
        }),
        context
      );

      expect(free.planned[0]).toMatchObject({
        mode: 'create',
        code: 'ALD001b'
      });
      expect(taken.rows[0]?.issues[0]?.message).toBe('codeDuplicate');
    });
  });

  describe('comments and notes', () => {
    it('turns cell comments into note lines named after their header', () => {
      const report = validateImport(
        payloadOf([row(2, ['ALD001', '100'], { '1': 'Re-measured' })]),
        EMPTY_CONTEXT
      );

      expect(report.planned[0]?.note).toBe('Power: Re-measured');
    });

    it('adds the note cell before the comments', () => {
      const report = validateImport(
        payloadOf(
          [row(2, ['ALD001', '100', 'from sheet'], { '1': 'check' })],
          [{ type: 'code' }, NEW_COLUMN('Power'), { type: 'note' }]
        ),
        EMPTY_CONTEXT
      );

      expect(report.planned[0]?.note).toBe('from sheet\nPower: check');
    });

    it('rejects a note over 500 characters on its row', () => {
      const report = validateImport(
        payloadOf([row(2, ['ALD001', '1'], { '1': 'x'.repeat(600) })]),
        EMPTY_CONTEXT
      );

      expect(report.rows[0]?.status).toBe('error');
      expect(report.rows[0]?.issues[0]?.message).toBe('noteTooLong');
    });

    it('appends comments after the existing note on an update', () => {
      const report = validateImport(
        payloadOf(
          [row(2, ['ALD001', '1'], { '1': 'new remark' })],
          [{ type: 'code' }, { type: 'column', columnId: 'c1' }],
          {
            target: { type: 'existing', experimentId: 'e1' },
            choices: { '2': { action: 'update' } }
          }
        ),
        {
          ...EMPTY_CONTEXT,
          columns: [column('c1', 'Power')],
          experimentSamples: [existingSample('ALD001', { note: 'old' })]
        }
      );

      expect(report.planned[0]?.note).toBe('old\nPower: new remark');
    });
  });

  describe('studies', () => {
    const mapping: ColumnTarget[] = [{ type: 'code' }, { type: 'studies' }];

    it('splits on semicolons, reuses an existing study ignoring case, creates the rest', () => {
      const report = validateImport(
        payloadOf(
          [row(2, ['ALD001', 'plasma pulse; Anneal ;; anneal'])],
          mapping
        ),
        {
          ...EMPTY_CONTEXT,
          studies: [
            {
              id: 's1',
              experimentId: 'e1',
              name: 'Plasma Pulse',
              description: null,
              createdAt: new Date(0)
            }
          ]
        }
      );

      expect(report.planned[0]?.studyNames).toEqual(['Plasma Pulse', 'Anneal']);
      expect(report.newStudyNames).toEqual(['Anneal']);
    });
  });

  describe('dates', () => {
    const mapping: ColumnTarget[] = [{ type: 'code' }, { type: 'date' }];

    it.each([
      ['iso', '2026-09-04', '2026-09-04'],
      ['dmy', '04/09/2026', '2026-09-04'],
      ['mdy', '09/04/2026', '2026-09-04']
    ] as const)('reads %s dates', (dateFormat, text, expected) => {
      const report = validateImport(
        payloadOf([row(2, ['ALD001', text])], mapping, { dateFormat }),
        EMPTY_CONTEXT
      );

      expect(report.planned[0]?.performedOn).toBe(expected);
    });

    it('rejects a date that does not exist instead of rolling it over', () => {
      const report = validateImport(
        payloadOf([row(2, ['ALD001', '31/02/2026'])], mapping, {
          dateFormat: 'dmy'
        }),
        EMPTY_CONTEXT
      );

      expect(report.rows[0]?.issues).toEqual([
        { column: 1, message: 'dateInvalid' }
      ]);
    });

    it('does not guess a day-first date when the format is ISO', () => {
      const report = validateImport(
        payloadOf([row(2, ['ALD001', '04/09/2026'])], mapping),
        EMPTY_CONTEXT
      );

      expect(report.rows[0]?.status).toBe('error');
    });
  });
});
