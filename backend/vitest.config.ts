// defineConfig from 'vitest/config' resolves to a CJS build that require()s
// std-env's ESM-only entry and crashes with ERR_REQUIRE_ESM before a single
// test runs. The root vite.config.mts sidesteps this by importing
// defineConfig from 'vite' itself (same test-config shape, different, working
// module resolution path) — do the same here.
import { defineConfig } from 'vite';

/**
 * Dedicated config for the backend integration tests.
 *
 * The root vite.config.mts runs the FRONTEND unit tests (happy-dom) and now
 * excludes backend/** so CI's `npm run test:run` stays fast and DB-free. The
 * backend integration suite needs a Node environment + a live database, so it
 * runs through this config instead:
 *
 *   npx tsx --tsconfig backend/tsconfig.json node_modules/vitest/vitest.mjs \
 *     run --config backend/vitest.config.ts
 *
 * Files run serially (single fork) so the shared database isn't mutated by two
 * suites at once — that was a source of flaky cross-suite failures.
 */
export default defineConfig({
  root: __dirname,
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 120000,
    hookTimeout: 120000,
    fileParallelism: false,
    pool: 'forks',
    // Vitest 4 moved this out of poolOptions to a top-level option.
    isolate: false,
  },
});
