import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only cleans up on its own when test globals are enabled.
// Without this, every render stays on the page for the next test.
afterEach(cleanup);
