import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../data/projects', () => ({ createProject: vi.fn() }));

import { revalidatePath } from 'next/cache';

import { createProject } from '../data/projects';
import { createProjectAction } from './create-project';

describe('createProjectAction', () => {
  it('stores a valid project and refreshes the dashboard', async () => {
    await createProjectAction({
      name: '  Alpha  ',
      codePrefix: 'EXP',
      protocol: ''
    });

    expect(createProject).toHaveBeenCalledTimes(1);
    expect(createProject).toHaveBeenCalledWith({
      name: 'Alpha',
      codePrefix: 'EXP',
      protocol: ''
    });
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('ignores invalid input', async () => {
    await createProjectAction({ name: '', codePrefix: 'x', protocol: '' });

    expect(createProject).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([undefined, null, 42, 'not an object'])(
    'ignores garbage input %j',
    async input => {
      await createProjectAction(input);

      expect(createProject).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    }
  );

  it('lets a storage failure reach the caller and does not refresh the page', async () => {
    vi.mocked(createProject).mockRejectedValueOnce(new Error('storage down'));

    await expect(
      createProjectAction({ name: 'Alpha', codePrefix: 'EXP', protocol: '' })
    ).rejects.toThrow('storage down');

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
