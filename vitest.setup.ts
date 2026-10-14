import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Every test file gets its own empty in-memory database with the example data,
// so tests that look for the demo records keep working. `getDb()` opens it on
// first use.
process.env.LAB_BRAIN_DATABASE_URL = ':memory:';
process.env.LAB_BRAIN_SEED_DEMO = 'true';

// Testing Library only cleans up on its own when test globals are enabled.
// Without this, every render stays on the page for the next test.
afterEach(cleanup);

// jsdom has no matchMedia; components that read the viewport (useIsMobile) need
// one. This stub reports a wide desktop screen.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList;
}
