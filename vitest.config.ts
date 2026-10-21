import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Several suites parse every MDX file on the site; give them room on
    // slower CI runners instead of the 5 s default.
    testTimeout: 60_000,
  },
});
