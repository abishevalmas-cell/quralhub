import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build (`next start`) on port 3400 with synthetic 17VIN fixtures,
// login codes shown on screen and a fresh embedded database per run.
//
//   npm run e2e                        build, start and test
//   E2E_SKIP_BUILD=1 npm run e2e       reuse the existing .next build
//   E2E_APP_DIR=/path/to/copy          serve a copy of the repo, so the build does not touch this checkout's .next
//   E2E_REUSE_SERVER=1                 test a server already listening on 3400 (its own database and env apply)

const PORT = 3400;
const baseURL = `http://127.0.0.1:${PORT}`;
const root = __dirname;
const appDir = path.resolve(process.env.E2E_APP_DIR || root);

// Each run gets its own database and uploads in .data/e2e-<time>-<pid>. The config is loaded by the runner and again
// by every worker; the runner picks the directory once and the workers inherit it through the environment.
const dataDir = path.join(root, ".data");
const RUN_DIR_RE = /^e2e-\d{14}-\d+$/;

// Keeps the two latest runs for looking into failures; older ones (28 MB each) go once they are an hour old,
// so a run still going on in another terminal keeps its files.
function pruneOldRuns(keep = 2, minAgeMs = 3600_000) {
  let names: string[] = [];
  try {
    names = readdirSync(dataDir).filter((name) => RUN_DIR_RE.test(name)).sort();
  } catch {
    return;
  }
  for (const name of names.slice(0, Math.max(0, names.length - keep))) {
    const dir = path.join(dataDir, name);
    try {
      if (Date.now() - statSync(dir).mtimeMs > minAgeMs) rmSync(dir, { recursive: true, force: true });
    } catch {
      // Gone already or still in use: either way not ours to worry about.
    }
  }
}

if (!process.env.E2E_RUN_DIR) {
  pruneOldRuns();
  process.env.E2E_RUN_DIR = path.join(dataDir, `e2e-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}-${process.pid}`);
}
const runDir = process.env.E2E_RUN_DIR;
mkdirSync(runDir, { recursive: true });

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "ru-RU",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Logs the administrator in once and saves the session: login codes are limited per phone number.
    { name: "setup", testMatch: /auth\.setup\.ts$/, use: { ...devices["Desktop Chrome"] } },
    { name: "desktop", dependencies: ["setup"], use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      dependencies: ["setup"],
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: `${process.env.E2E_SKIP_BUILD === "1" ? "" : "npm run build && "}npx next start -p ${PORT} -H 127.0.0.1`,
    cwd: appDir,
    url: `${baseURL}/login`,
    timeout: 300_000,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    stdout: "ignore",
    stderr: "pipe",
    env: {
      AUTH_SECRET: "e2e-secret-not-for-production-0123456789",
      AUTH_DEV_CODES: "1",
      ADMIN_PHONES: "77010000001",
      PGLITE_DIR: path.join(runDir, "pglite"),
      UPLOAD_DIR: path.join(runDir, "uploads"),
      APP_URL: baseURL,
      // Whatever the shell or .env files say: embedded database, synthetic catalog, no SMS, no Telegram.
      DATABASE_URL: "",
      TETIX_17VIN_USER: "",
      TETIX_17VIN_PASSWORD: "",
      SMS_GATEWAY_URL: "",
      TELEGRAM_BOT_TOKEN: "",
    },
  },
});
