import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://pnhd-studio-clone.vercel.app'

export default defineConfig({
  testDir: './specs',
  testMatch: /tour\.spec\.ts$/,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 3,
  reporter: [['list'], ['json', { outputFile: 'results/tour.json' }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  },
  projects: [
    {
      name: 'm-375',
      use: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: 'm-390',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: 't-768',
      use: { viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
    },
    {
      name: 't-1024',
      use: { viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
    },
    {
      name: 'd-1280',
      use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    },
    {
      name: 'd-1440',
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
    {
      name: 'd-1920',
      use: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
    },
  ],
})
