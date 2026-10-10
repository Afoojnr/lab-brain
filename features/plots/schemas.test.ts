import { describe, expect, it } from 'vitest';

import { buildSavedPlotSchema } from './schemas';
import { DEFAULT_STYLE } from './style';

const COLUMNS = [
  { key: 'temp', kind: 'number' as const },
  { key: 'thick', kind: 'number' as const },
  { key: 'substrate', kind: 'text' as const }
];
const VALID = {
  name: '  GPC at 600  ',
  settings: {
    x: 'temp',
    y: 'thick',
    error: null,
    group: { type: 'column', key: 'substrate' },
    logX: false,
    logY: true
  },
  filters: [
    { type: 'values', key: 'substrate', values: ['Si', 600] },
    { type: 'range', key: 'temp', min: '150', max: '' }
  ],
  untickedIds: ['s1'],
  style: DEFAULT_STYLE
};

const parse = (input: unknown, others: string[] = []) =>
  buildSavedPlotSchema(COLUMNS, others).safeParse(input);

describe('buildSavedPlotSchema', () => {
  it("accepts a plot of the experiment's own columns and trims the title", () => {
    const result = parse(VALID);

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe('GPC at 600');
  });

  it('requires a title and refuses one another saved plot has, ignoring case', () => {
    expect(parse({ ...VALID, name: '   ' }).error?.issues[0].message).toBe(
      'nameRequired'
    );
    expect(parse(VALID, ['gpc AT 600']).error?.issues[0].message).toBe(
      'nameDuplicate'
    );
    expect(
      parse({ ...VALID, name: 'x'.repeat(81) }).error?.issues[0].message
    ).toBe('nameTooLong');
  });

  it('refuses an axis, error bar, group or filter on a column the experiment does not have', () => {
    const settings = VALID.settings;

    expect(
      parse({ ...VALID, settings: { ...settings, x: 'nope' } }).success
    ).toBe(false);
    expect(
      parse({ ...VALID, settings: { ...settings, y: 'nope' } }).success
    ).toBe(false);
    expect(
      parse({
        ...VALID,
        settings: { ...settings, group: { type: 'column', key: 'nope' } }
      }).success
    ).toBe(false);
    expect(
      parse({
        ...VALID,
        filters: [{ type: 'values', key: 'nope', values: [1] }]
      }).success
    ).toBe(false);
  });

  it('refuses text on an axis or error bar, and a range filter on a text column', () => {
    const settings = VALID.settings;

    expect(
      parse({ ...VALID, settings: { ...settings, x: 'substrate' } }).success
    ).toBe(false);
    expect(
      parse({ ...VALID, settings: { ...settings, error: 'substrate' } }).success
    ).toBe(false);
    expect(
      parse({
        ...VALID,
        filters: [{ type: 'range', key: 'substrate', min: '1', max: '' }]
      }).success
    ).toBe(false);
  });

  it('refuses a malformed payload', () => {
    expect(parse({ ...VALID, untickedIds: 'all' }).success).toBe(false);
    expect(parse({ ...VALID, filters: [{ type: 'other' }] }).success).toBe(
      false
    );
    expect(parse(null).success).toBe(false);
  });

  it('refuses a style with an unknown size or a non-text range', () => {
    expect(
      parse({ ...VALID, style: { ...VALID.style, textSize: 'huge' } }).success
    ).toBe(false);
    expect(
      parse({ ...VALID, style: { ...VALID.style, xMin: 5 } }).success
    ).toBe(false);
    expect(parse({ ...VALID, style: undefined }).success).toBe(false);
  });
});
