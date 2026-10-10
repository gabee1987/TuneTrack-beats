import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

// `scripts/check-e2e-budget.mjs` reads this after every green run.
const resultsFile = "test-results/e2e-results.json";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [
    ["line"],
    ["json", { outputFile: resultsFile }],
    ...(process.env.CI ? [["html", { open: "never" }] as const] : []),
  ],
  testDir: "./tests",
  timeout: 30_000,
  // Every spec shares one backend whose grace periods are timed; parallel workers made those
  // timings depend on machine load.
  workers: 1,
  use: {
    baseURL: "https://127.0.0.1:4173",
    ignoreHTTPSErrors: true,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node apps/e2e/fake-spotify-server.mjs",
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PORT: "3102",
      },
      reuseExistingServer: false,
      url: "http://127.0.0.1:3102/health",
    },
    {
      command: "npm run start -w @tunetrack/server",
      cwd: repositoryRoot,
      env: {
        ...process.env,
        CLIENT_ORIGIN: "https://127.0.0.1:4173",
        HOST_TRANSFER_GRACE_MS: "5000",
        ALL_PLAYERS_OFFLINE_ROOM_TTL_MS: "2000",
        MAX_ACTIVE_ROOMS: "20",
        NODE_ENV: "test",
        PORT: "3101",
        SPOTIFY_ACCOUNTS_BASE_URL: "http://127.0.0.1:3102/accounts",
        SPOTIFY_API_BASE_URL: "http://127.0.0.1:3102/api",
        SPOTIFY_CLIENT_ID: "e2e-client-id",
        SPOTIFY_CLIENT_SECRET: "e2e-client-secret",
        SPOTIFY_REDIRECT_URI: "http://127.0.0.1:3101/api/spotify/callback",
        TEST_DECK_RANDOM_VALUE: "0.25",
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
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
});
