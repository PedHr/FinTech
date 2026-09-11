import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const usesExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const protectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    extraHTTPHeaders: protectionBypass ? {
      "x-vercel-protection-bypass": protectionBypass,
      "x-vercel-set-bypass-cookie": "true",
    } : undefined,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: usesExternalServer ? undefined : {
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
