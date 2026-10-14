import { describe, expect, it } from 'vitest';

import { deleteAnalysesOf, getAnalysis, saveAnalysis } from './analyses';
import { defaultSettings } from '../analysis/defaults';

describe('deleteAnalysesOf', () => {
  it('removes the saved analyses of the characterizations that are gone, and no others', async () => {
    await saveAnalysis('gone-1', 'edx', defaultSettings('edx'));
    await saveAnalysis('gone-1', 'ftir', defaultSettings('ftir'));
    await saveAnalysis(
      'gone-2',
      'ellipsometry',
      defaultSettings('ellipsometry')
    );
    await saveAnalysis('kept', 'edx', defaultSettings('edx'));

    expect(await deleteAnalysesOf(['gone-1', 'gone-2'])).toBe(3);

    expect(await getAnalysis('gone-1', 'edx')).toBeUndefined();
    expect(await getAnalysis('gone-2', 'ellipsometry')).toBeUndefined();
    expect(await getAnalysis('kept', 'edx')).toBeDefined();
    expect(await deleteAnalysesOf([])).toBe(0);
  });
});
