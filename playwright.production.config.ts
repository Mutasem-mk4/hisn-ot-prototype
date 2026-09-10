import { defineConfig, devices } from '@playwright/test';

const productionUrl = process.env.HISN_PRODUCTION_URL ?? 'https://hisn-ot-prototype.vercel.app';

export default defineConfig({
  testDir: './tests/production',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 150_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-production-report' }]],
  use: {
    baseURL: productionUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'production-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
