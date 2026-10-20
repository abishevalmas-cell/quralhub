import path from "node:path";
import { expect, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

// The admin phone is listed in ADMIN_PHONES in playwright.config.ts.
export const ADMIN_PHONE = "77010000001";

export function runDir(): string {
  const dir = process.env.E2E_RUN_DIR;
  if (!dir) throw new Error("E2E_RUN_DIR is set by playwright.config.ts");
  return dir;
}

export const adminStatePath = () => path.join(runDir(), "admin-state.json");

// A fresh Kazakhstan number per call: every test signs up its own customers.
export function newPhone(): string {
  return "7705" + String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0");
}

// A short unique tag that tests write into requests to find their own among other runs and projects.
export const uniqueTag = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

// Signs in through the login screen: without an SMS gateway the dev-code mode shows the code on screen.
export async function login(page: Page, phone: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Номер телефона").fill(`+${phone}`);
  await page.getByRole("button", { name: "Получить код" }).click();
  const hint = page.getByText(/Режим разработки: SMS не подключены, код/);
  await expect(hint).toBeVisible();
  const code = (await hint.locator(".font-mono").textContent())?.trim() ?? "";
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel(/Код из сообщения на/).fill(code);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  const target = new URL(next, "http://x").pathname;
  await page.waitForURL((url) => url.pathname === target);
}

// The server runs `next start`, so the session cookie is Secure. Chromium sends it to http://127.0.0.1, but
// Playwright's API client (context.request) sends Secure cookies only over https or to "localhost": API calls
// pass the context's cookies explicitly.
export async function sessionHeaders(context: BrowserContext): Promise<Record<string, string>> {
  const cookies = await context.cookies();
  return { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") };
}

// GET with the session cookie, following same-site redirects by hand: on a redirect Playwright drops an explicit
// Cookie header. Next.js answers an RSC request without a matching `_rsc` parameter with a redirect to one.
export async function getAsUser(context: BrowserContext, path: string, extra: Record<string, string> = {}) {
  const headers = { ...(await sessionHeaders(context)), ...extra };
  let url = path;
  for (let hop = 0; hop < 5; hop++) {
    const response = await context.request.get(url, { headers, maxRedirects: 0 });
    const location = response.headers()["location"];
    if (response.status() < 300 || response.status() >= 400 || !location) return response;
    const next = new URL(location, response.url());
    if (next.origin !== new URL(response.url()).origin) throw new Error(`Redirect to another site: ${location}`);
    url = next.pathname + next.search;
  }
  throw new Error(`Too many redirects from ${path}`);
}

// A second browser context with the same device settings as the project (viewport, touch, user agent).
export async function newUserContext(browser: Browser, testInfo: TestInfo, storageState?: string): Promise<BrowserContext> {
  const use = testInfo.project.use;
  return browser.newContext({
    baseURL: use.baseURL,
    locale: use.locale,
    viewport: use.viewport,
    userAgent: use.userAgent,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    storageState,
  });
}

// Uncaught exceptions and console errors in the browser (hydration mismatches, failing client code). A 404 the
// test asked for is logged by Chromium as a failed resource and is not counted.
export function collectBrowserErrors(page: Page, errors: string[] = []): string[] {
  page.on("pageerror", (error) => errors.push(`${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource"))
      errors.push(`${page.url()}: ${message.text()}`);
  });
  return errors;
}

// A 1×1 PNG: the server checks the file signature, and the browser can render it as a thumbnail.
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export function uuidFrom(url: string, prefix: string): string {
  const match = new RegExp(`${prefix}/([0-9a-f-]{36})`).exec(new URL(url).pathname);
  if (!match) throw new Error(`No id after ${prefix} in ${url}`);
  return match[1];
}
