import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:3000", trace: "on-first-retry" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "corepack pnpm dev",
    url: "http://127.0.0.1:3000/entrar",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      APP_URL: "http://127.0.0.1:3000",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "playwright-only-secret-with-at-least-32-characters",
      STORAGE_DRIVER: "local",
    },
  },
});
