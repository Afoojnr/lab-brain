import { describe, expect, it } from 'vitest';

import { readSeqfitItems } from './from-files';

// FAKE numbers in the layout of the instrument's fit export.
const SEQFIT = `Phase No.,Phase Desc,SubLay No.,Site No.,X,Y,Z,d(nm),d 2s(nm),n,k,R2,RMSE,Date&Time,Measurement
1,Dispersionlaws,0,,0,0,9.0,10.0,0.5,1.5,0,0.8,2.4,'2026/01/01 10:00:00',FAKE001_pt1
,,,,,,,,,,,,,,
,,,,,,,d(nm),d 2s(nm),n,k,,,,
Average,,,,,,,11.0,0.6,1.6,0,,,,
StdDeviation,,,,,,,1.0,0.07,0.1,0,,,,
`;

describe('readSeqfitItems', () => {
  it('names each item after its file, without the extension and _seqfit', () => {
    const items = readSeqfitItems([
      { path: 'AAA160_seqfit.csv', text: SEQFIT },
      { path: 'folder/AAA159_seqfit.csv', text: SEQFIT }
    ]);

    expect(items.map(item => item.id)).toEqual(['AAA159', 'AAA160']);
    expect(items[0]?.summary?.thickness).toEqual({ mean: 11, std: 1 });
  });

  it('reports a CSV that is not a fit export, with its reason', () => {
    const [item] = readSeqfitItems([{ path: 'notes.csv', text: 'a,b\n1,2' }]);

    expect(item).toMatchObject({
      id: 'notes',
      summary: null,
      reason: 'notSeqfit'
    });
  });

  it('ignores files that are not CSV', () => {
    expect(readSeqfitItems([{ path: 'photo.png', text: '' }])).toEqual([]);
  });
});
