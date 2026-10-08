import { describe, expect, it } from 'vitest';

import { parseEmsa, parseQuantification } from './parse';

// Fake values; only the layout matches what the microscope exports.
const QUANTIFICATION = `Atomic number,Element symbol,Element name,Atomic concentration percentage,Weight concentration percentage,Energy level
5,B,Boron,0.36,0.13,10000
7,N,Nitrogen,0.0555,0.026,10000
`;

describe('parseQuantification', () => {
  it('reads the symbol and the atomic concentration as a fraction', () => {
    expect(parseQuantification(QUANTIFICATION)).toEqual({
      isOk: true,
      atomic: { B: 0.36, N: 0.0555 }
    });
  });

  it('refuses a file without the two columns it needs', () => {
    expect(parseQuantification('a,b\n1,2')).toEqual({
      isOk: false,
      reason: 'missingColumns'
    });
  });

  it('refuses a number that is not one instead of reading it as 0', () => {
    const text = QUANTIFICATION.replace('0.36', 'abc');

    expect(parseQuantification(text)).toEqual({
      isOk: false,
      reason: 'invalidNumber'
    });
  });

  it('refuses an empty table', () => {
    expect(
      parseQuantification('Element symbol,Atomic concentration percentage\n')
    ).toEqual({ isOk: false, reason: 'empty' });
  });
});

describe('parseEmsa', () => {
  const EMSA = `#FORMAT      : EMSA/MAS Spectral Data File
#NPOINTS     : 4.
#XPERCHAN    : 10.0
#OFFSET      : -30.0
#SPECTRUM    : Spectral Data Starts Here
0.0,
5.0,
7.0,
3.0,
#ENDOFDATA   :
`;

  it('gives the energy of each channel from the header, in keV', () => {
    const spectrum = parseEmsa(EMSA);

    expect(spectrum?.counts).toEqual([0, 5, 7, 3]);
    expect(spectrum?.energyKev).toEqual([-0.03, -0.02, -0.01, 0]);
  });

  it('is null without the header values or the data', () => {
    expect(parseEmsa('#TITLE : x\n#SPECTRUM : y\n1.0,\n')).toBeNull();
    expect(parseEmsa('#XPERCHAN : 1\n#OFFSET : 0\n#SPECTRUM : y\n')).toBeNull();
  });
});
