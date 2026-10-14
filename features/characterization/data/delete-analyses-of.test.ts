import { describe, expect, it } from 'vitest';

import { deleteAnalysesOf, getAnalysis, saveAnalysis } from './analyses';
import { defaultSettings } from '../analysis/defaults';

describe('deleteAnalysesOf', () => {
  it('removes the saved analyses of the characterizations that are gone, and no others', async () => {
    await saveAnalysis(
      'demo-characterization-1',
      'edx',
      defaultSettings('edx')
    );
    await saveAnalysis(
      'demo-characterization-1',
      'ftir',
      defaultSettings('ftir')
    );
    await saveAnalysis(
      'demo-characterization-2',
      'ellipsometry',
      defaultSettings('ellipsometry')
    );
    await saveAnalysis(
      'demo-characterization-3',
      'edx',
      defaultSettings('edx')
    );

    expect(
      await deleteAnalysesOf([
        'demo-characterization-1',
        'demo-characterization-2'
      ])
    ).toBe(3);

    expect(await getAnalysis('demo-characterization-1', 'edx')).toBeUndefined();
    expect(
      await getAnalysis('demo-characterization-2', 'ellipsometry')
    ).toBeUndefined();
    expect(await getAnalysis('demo-characterization-3', 'edx')).toBeDefined();
    expect(await deleteAnalysesOf([])).toBe(0);
  });
});
