import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/projects', () => ({ updateProject: vi.fn() }));

import { revalidatePath } from 'next/cache';

import { updateProject } from '../data/projects';
import { updateProjectAction } from './update-project';

const PROJECT = {
  id: 'project-1',
  name: 'Alpha',
  description: null,
  createdAt: new Date()
};

describe('updateProjectAction', () => {
  it('saves the change, refreshes the dashboard and project page and returns true', async () => {
    vi.mocked(updateProject).mockResolvedValueOnce(PROJECT);

    const result = await updateProjectAction('project-1', {
      name: '  Alpha ',
      description: ' About it '
    });

    expect(updateProject).toHaveBeenCalledWith('project-1', {
      name: 'Alpha',
      description: 'About it'
    });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/projects/project-1');
    expect(result).toBe(true);
  });

  it.each([undefined, null, 42, { name: '', description: '' }])(
    'ignores invalid input %j',
    async input => {
      expect(await updateProjectAction('project-1', input)).toBe(false);
      expect(updateProject).not.toHaveBeenCalled();
    }
  );

  it('returns false and refreshes nothing when the project does not exist', async () => {
    vi.mocked(updateProject).mockResolvedValueOnce(undefined);

    expect(
      await updateProjectAction('missing', { name: 'Alpha', description: '' })
    ).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
