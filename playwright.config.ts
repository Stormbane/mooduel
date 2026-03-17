import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:3007",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3007",
    url: "http://localhost:3007",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
