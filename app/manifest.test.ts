import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import manifest from './manifest';

describe('manifest', () => {
  it('names the app and starts at the home page', () => {
    expect(manifest()).toMatchObject({
      name: 'Lab Brain',
      short_name: 'Lab Brain',
      start_url: '/',
      display: 'standalone'
    });
  });

  it('points at icon files that exist, including a 512 px one', () => {
    const icons = manifest().icons ?? [];

    expect(icons.map(icon => icon.sizes)).toContain('512x512');
    for (const icon of icons) {
      expect(existsSync(path.join(process.cwd(), 'public', icon.src))).toBe(
        true
      );
    }
  });
});
