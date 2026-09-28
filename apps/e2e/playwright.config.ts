import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "https://127.0.0.1:4173",
    ignoreHTTPSErrors: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run start -w @tunetrack/server",
      cwd: repositoryRoot,
      env: {
        ...process.env,
        CLIENT_ORIGIN: "https://127.0.0.1:4173",
        NODE_ENV: "test",
        PORT: "3101",
        SPOTIFY_CLIENT_ID: "e2e-client-id",
        SPOTIFY_CLIENT_SECRET: "e2e-client-secret",
        SPOTIFY_REDIRECT_URI: "http://127.0.0.1:3101/api/spotify/callback",
      },
      reuseExistingServer: false,
      url: "http://127.0.0.1:3101/health",
    },
    {
      command: "npm run preview -w @tunetrack/web -- --host 127.0.0.1 --port 4173 --strictPort",
      cwd: repositoryRoot,
      env: {
        ...process.env,
        TUNETRACK_BACKEND_PROXY_TARGET: "http://127.0.0.1:3101",
      },
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      url: "https://127.0.0.1:4173",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
