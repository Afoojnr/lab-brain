import { describe, expect, it } from 'vitest';

import { ellipsometryValues, parseSeqfit } from './parse';

// FAKE numbers in the layout of the instrument's fit export: the fitted points,
// a summary block, then the substrate and total-thickness tables with their own
// Average rows (which must not be read).
const SEQFIT = `Phase No.,Phase Desc,SubLay No.,Site No.,X,Y,Z,d(nm),d 2s(nm),n,k,R2,RMSE,Date&Time,Measurement
1,Dispersionlaws,0,,0,0,9.0,10.0,0.5,1.5,0,0.8,2.4,'2026/01/01 10:00:00',FAKE001_pt1
1,Dispersionlaws,0,,0,0,9.0,12.0,0.5,1.7,0,0.8,2.4,'2026/01/01 10:01:00',FAKE001_pt2
,,,,,,,,,,,,,,
,,,,,,,d(nm),d 2s(nm),n,k,,,,
Minimum,,,,,,,10.0,0.5,1.5,0,,,,
Average,,,,,,,11.0,0.6,1.6,0,,,,
StdDeviation,,,,,,,1.0,0.07,0.1,0,,,,
,,,,,,,,,,,,,,
Phase No.,Phase Desc,SubLay No.,,X,Y,Z,d(nm),d 2s(nm),n,k,R2,RMSE,Date&Time,Measurement
0,Si_(100),0,,0,0,9.0,   infinity,   infinity,3.8,0.01,0.8,2.4,'2026/01/01 10:00:00',FAKE001_pt1
,,,,,,,,,n,k,,,,
Average,,,,,,,,,3.8,0.01,,,,
StdDeviation,,,,,,,,,0,0,,,,
`;

describe('parseSeqfit', () => {
  it('reads thickness and n from the Average and StdDeviation rows of the first summary block', () => {
    const result = parseSeqfit(SEQFIT);

    expect(result.isOk && result.summary.thickness).toEqual({
      mean: 11,
      std: 1
    });
    expect(result.isOk && result.summary.n).toEqual({ mean: 1.6, std: 0.1 });
  });

  it('finds the columns by header, wherever they are', () => {
    // Two extra columns in front: the same numbers sit two places to the right.
    const moved = SEQFIT.split('\n')
      .map(line =>
        line.includes('Phase') || line === '' ? line : `x,x,${line}`
      )
      .join('\n');

    expect(parseSeqfit(moved).isOk).toBe(false);

    const widened = SEQFIT.split('\n')
      .map(line =>
        line.startsWith(',,,,,,,d(nm)') ||
        /^(Minimum|Average|StdDeviation),/.test(line)
          ? `${line.split(',')[0]},,,${line.split(',').slice(1).join(',')}`
          : line
      )
      .join('\n');
    const result = parseSeqfit(widened);
    expect(result.isOk && result.summary.thickness).toEqual({
      mean: 11,
      std: 1
    });
  });

  it('never reads an empty cell as 0', () => {
    const blank = SEQFIT.replace('Average,,,,,,,11.0', 'Average,,,,,,,');

    expect(parseSeqfit(blank)).toEqual({
      isOk: false,
      reason: 'invalidNumber'
    });
  });

  it('lists the fitted points', () => {
    const result = parseSeqfit(SEQFIT);

    expect(result.isOk && result.summary.points).toEqual([
      { label: 'FAKE001_pt1', thickness: 10, n: 1.5 },
      { label: 'FAKE001_pt2', thickness: 12, n: 1.7 }
    ]);
  });

  it('refuses a file that is not a fit export', () => {
    expect(parseSeqfit('a,b\n1,2')).toEqual({
      isOk: false,
      reason: 'notSeqfit'
    });
  });

  it('refuses a summary whose number is not a number', () => {
    const broken = SEQFIT.replace('Average,,,,,,,11.0', 'Average,,,,,,,abc');

    expect(parseSeqfit(broken)).toEqual({
      isOk: false,
      reason: 'invalidNumber'
    });
  });
});

describe('ellipsometryValues', () => {
  it('offers thickness and n, each with its std', () => {
    const result = parseSeqfit(SEQFIT);
    const values = result.isOk ? ellipsometryValues(result.summary) : [];

    expect(values.map(value => [value.id, value.value])).toEqual([
      ['thickness', 11],
      ['thickness:std', 1],
      ['n', 1.6],
      ['n:std', 0.1]
    ]);
    expect(values[0]?.unit).toBe('nm');
  });
});
