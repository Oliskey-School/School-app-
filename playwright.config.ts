import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { outputFolder: '.playwright-report' }]],
  /* Directory for artifacts like screenshots, videos, traces, etc. */
  outputDir: './.playwright-results',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests.
   *
   * Skipped entirely whenever BASE_URL is set — i.e. any run against a
   * server someone else already started (CI starts its own backend +
   * `vite preview`; a manual run may point at a deployed host). This is a
   * safety guard, not a tidiness one: `npm run start:all` triggers
   * `prestart:all` -> `npm run kill-ports`, and scripts/kill-ports.js does
   * `lsof -t -i:3000 | xargs kill -9` — port 3000 being exactly where the
   * production backend listens (what Apache proxies to). `reuseExistingServer`
   * alone is NOT sufficient protection: it only skips the command while
   * something answers on `url`, so a run started while production happened
   * to be down would kill-9 the live backend and spawn dev servers in its
   * place. Keying off BASE_URL removes that path completely.
   */
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run start:all',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },
});
