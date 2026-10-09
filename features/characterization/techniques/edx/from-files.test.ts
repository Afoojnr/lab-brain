import { describe, expect, it } from 'vitest';

import { groupEdxItems, looksLikeDateFolder } from './from-files';

// Fake numbers in the microscope's export layout.
const quantification = (b: number, n: number) =>
  `Atomic number,Element symbol,Element name,Atomic concentration percentage,Weight concentration percentage,Energy level\n5,B,Boron,${b},0.1,10000\n7,N,Nitrogen,${n},0.1,10000\n`;
const EMSA =
  '#XPERCHAN : 10.0\n#OFFSET : 0.0\n#SPECTRUM : Spectral Data Starts Here\n1.0,\n5.0,\n';

const file = (path: string, text: string) => ({ path, text });

describe('groupEdxItems', () => {
  const SAMPLE_FOLDER = [
    file(
      'ABC130/export/Image 1_analysis_1_spot/quantification.csv',
      quantification(0.5, 0.3)
    ),
    file('ABC130/export/Image 1_analysis_1_spot/spectrum.emsa', EMSA),
    file(
      'ABC130/export/Image 1_analysis_2_spot/quantification.csv',
      quantification(0.4, 0.3)
    )
  ];

  it('makes the dropped folder one sample, with each quantification file as a spot', () => {
    const items = groupEdxItems(SAMPLE_FOLDER, 0);

    expect(items.map(item => item.id)).toEqual(['ABC130']);
    expect(items[0]?.spots.map(spot => spot.label)).toEqual([
      'Image 1_analysis_1_spot',
      'Image 1_analysis_2_spot'
    ]);
    expect(items[0]?.spots[0]?.atomic).toEqual({ B: 0.5, N: 0.3 });
  });

  it('attaches the spectrum that sits beside a spot, and none to a spot without one', () => {
    const [item] = groupEdxItems(SAMPLE_FOLDER, 0);

    expect(item?.spots[0]?.spectrum?.counts).toEqual([1, 5]);
    expect(item?.spots[1]?.spectrum).toBeNull();
  });

  it("reads a day's folder as several samples, one level down", () => {
    const items = groupEdxItems(
      [
        file(
          '2026-05-22/ABC131/export/s1/quantification.csv',
          quantification(0.5, 0.3)
        ),
        file(
          '2026-05-22/ABC130/export/s1/quantification.csv',
          quantification(0.4, 0.3)
        ),
        file(
          '2026-05-22/ABC130/export/s2/quantification.csv',
          quantification(0.6, 0.3)
        )
      ],
      1
    );

    expect(items.map(item => [item.id, item.spots.length])).toEqual([
      ['ABC130', 2],
      ['ABC131', 1]
    ]);
  });

  it('treats several dropped sample folders as several samples', () => {
    const items = groupEdxItems(
      [
        file('ABC1/export/s/quantification.csv', quantification(0.5, 0.3)),
        file('ABC2/export/s/quantification.csv', quantification(0.5, 0.3))
      ],
      0
    );

    expect(items.map(item => item.id)).toEqual(['ABC1', 'ABC2']);
  });

  it('is a sample of one spot when a spot folder is dropped alone', () => {
    const items = groupEdxItems(
      [file('spot1/quantification.csv', quantification(0.5, 0.3))],
      0
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.spots).toHaveLength(1);
  });

  it('reports a file it cannot read instead of skipping it silently', () => {
    const [item] = groupEdxItems(
      [
        file('ABC1/s/quantification.csv', quantification(0.5, 0.3)),
        file('ABC1/bad/quantification.csv', 'a,b\n1,2')
      ],
      0
    );

    expect(item?.spots).toHaveLength(1);
    expect(item?.problems).toEqual([
      { file: 'ABC1/bad/quantification.csv', reason: 'missingColumns' }
    ]);
  });

  it('leaves out hidden files and folders', () => {
    const items = groupEdxItems(
      [
        file('ABC1/s/quantification.csv', quantification(0.5, 0.3)),
        file('ABC1/.hidden/quantification.csv', quantification(0.9, 0.1))
      ],
      0
    );

    expect(items[0]?.spots).toHaveLength(1);
  });

  it('has nothing for files that are not at the right depth', () => {
    expect(
      groupEdxItems([file('quantification.csv', quantification(0.5, 0.3))], 0)
    ).toEqual([]);
    expect(
      groupEdxItems(
        [file('ABC1/quantification.csv', quantification(0.5, 0.3))],
        1
      )
    ).toEqual([]);
  });
});

describe('looksLikeDateFolder', () => {
  it.each([
    ['2026-05-22', true],
    ['2026-05-22 batch', true],
    ['20260522', true],
    ['ABC130', false],
    ['export', false]
  ])('%s is %s', (name, expected) => {
    expect(looksLikeDateFolder(name)).toBe(expected);
  });
});
