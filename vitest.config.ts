import { defineConfig } from 'vitest/config';

// Unit tests of the site and the synced packages; e2e/ holds Playwright specs, run by `npm run e2e`.
export default defineConfig({
  test: { include: ['src/**/*.test.ts', 'packages/*/src/**/*.test.ts'] },
});
