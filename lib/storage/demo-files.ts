import path from 'node:path';

import { createLocalStorage } from './local-adapter';
import { getStorage } from './index';

/** The example files, next to the example data that points at them. */
const DEMO_FILES = () => path.join(process.cwd(), 'lib', 'db', 'demo', 'files');

/** Where they are kept in storage; the example datasets' paths start with it. */
const DEMO_PREFIX = 'demo';

/**
 * Puts the example files into the storage in use (under `demo/`), so the
 * example data's attached files open.
 */
export const copyDemoFiles = async (): Promise<number> => {
  const source = createLocalStorage(DEMO_FILES());
  const target = getStorage();
  let copied = 0;
  for (const file of await source.list('')) {
    const bytes = await source.download(file);
    if (!bytes) continue;

    await target.upload(`${DEMO_PREFIX}/${file}`, bytes);
    copied += 1;
  }

  return copied;
};
