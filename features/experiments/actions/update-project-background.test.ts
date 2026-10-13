import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/projects', () => ({ updateProjectBackground: vi.fn() }));

import { revalidatePath } from 'next/cache';

import { updateProjectBackground } from '../data/projects';
import { updateProjectBackgroundAction } from './update-project-background';

const PROJECT = {
  id: 'project-1',
  name: 'Alpha',
  description: null,
  background: null,
  createdAt: new Date()
};

beforeEach(() => vi.clearAllMocks());

describe('updateProjectBackgroundAction', () => {
  it('saves the trimmed text and refreshes the project page', async () => {
    vi.mocked(updateProjectBackground).mockResolvedValueOnce(PROJECT);

    expect(
      await updateProjectBackgroundAction('project-1', {
        background: '  ## Goal\n\nBoron carbide films.  '
      })
    ).toBe(true);
    expect(updateProjectBackground).toHaveBeenCalledWith('project-1', {
      background: '## Goal\n\nBoron carbide films.'
    });
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-1');
  });

  it('accepts empty text, which clears the background', async () => {
    vi.mocked(updateProjectBackground).mockResolvedValueOnce(PROJECT);

    expect(
      await updateProjectBackgroundAction('project-1', { background: '' })
    ).toBe(true);
  });

  it('accepts 20,000 characters and ignores one more', async () => {
    vi.mocked(updateProjectBackground).mockResolvedValue(PROJECT);

    expect(
      await updateProjectBackgroundAction('project-1', {
        background: 'x'.repeat(20000)
      })
    ).toBe(true);
    expect(
      await updateProjectBackgroundAction('project-1', {
        background: 'x'.repeat(20001)
      })
    ).toBe(false);
  });

  it.each([undefined, null, 42, { background: 5 }])(
    'ignores garbage %j',
    async input => {
      expect(await updateProjectBackgroundAction('project-1', input)).toBe(
        false
      );
      expect(updateProjectBackground).not.toHaveBeenCalled();
    }
  );

  it('returns false and refreshes nothing when the project does not exist', async () => {
    vi.mocked(updateProjectBackground).mockResolvedValueOnce(undefined);

    expect(
      await updateProjectBackgroundAction('ghost', { background: 'x' })
    ).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
