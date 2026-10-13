import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "vite";
for (const [key, value] of Object.entries(loadEnv("development", process.cwd(), ""))) process.env[key] ??= value;
export default defineConfig({
  testDir: "./tests/pair-live-browser",
  workers: 1,
  timeout: 120_000,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3100", trace: "off" },
  webServer: { command: "npm run dev -- --port 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 120_000 },
});
