import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  // Output directory for test artifacts (screenshots, videos, traces)
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:5173/cyber-department-schedule/',
    trace: 'on-first-retry',
    // Keep screenshots for the faculty workflow tests
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Default viewport for consistent screenshots
    viewport: { width: 1280, height: 800 },
    // Slow down actions slightly for more stable screenshots
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173/cyber-department-schedule/',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
