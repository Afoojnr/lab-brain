import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Same `@/` shortcut as tsconfig.json, so tests import code the way the app does.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e']
  }
});
