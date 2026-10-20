import { expect, test } from "@playwright/test";
import { FIXTURE_VINS } from "../lib/providers/fixture";
import { collectBrowserErrors, login, newPhone, sessionHeaders, uuidFrom } from "./helpers";

// The BYD fixture VIN matches two trims (4G and 5G telematics). Nothing may be chosen for the owner.
test("an ambiguous VIN shows the trim candidates and does not pick one", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await login(page, newPhone(), "/garage/new");
  await page.getByLabel("VIN", { exact: true }).fill(FIXTURE_VINS.bydSongPlus);
  await page.getByRole("button", { name: "Добавить по VIN" }).click();
  await page.waitForURL(/\/garage\/[0-9a-f-]{36}$/);
  const vehicleId = uuidFrom(page.url(), "/garage");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("BYD Song Plus DM-i");
  await expect(page.getByText("Уточните комплектацию", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Уточните комплектацию" })).toBeVisible();
  await expect(page.getByText("Не выбрана", { exact: true })).toBeVisible();

  const candidates = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Это моя комплектация" }) });
  await expect(candidates).toHaveCount(2);
  await expect(candidates.nth(0)).toContainText("Champion Edition 150KM Flagship PLUS");
  await expect(candidates.nth(1)).toContainText("Champion Edition 150KM Flagship PLUS 5G");
  await expect(page.getByText("Ваша комплектация", { exact: true })).toHaveCount(0);

  const api = await page.context().request.get(`/api/vehicles/${vehicleId}`, { headers: await sessionHeaders(page.context()) });
  expect(api.ok()).toBeTruthy();
  type VehicleJson = { decodeStatus: string; selectedCandidateId: string | null; trim: string | null; candidates: unknown[] };
  const { vehicle } = (await api.json()) as { vehicle: VehicleJson };
  expect(vehicle.decodeStatus).toBe("ambiguous");
  expect(vehicle.selectedCandidateId).toBeNull();
  expect(vehicle.trim).toBeNull();
  expect(vehicle.candidates).toHaveLength(2);

  // Until the owner confirms the trim, no catalog part is "Подходит по VIN".
  await page.getByRole("link", { name: /10 Electrical equipment/ }).click();
  await page.getByRole("link", { name: /Wipers and washers/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wipers and washers");
  const parts = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Запросить цену" }) });
  await expect(parts).toHaveCount(2);
  await expect(parts.getByText("Нужна проверка")).toHaveCount(2);
  await expect(page.getByText("Подходит по VIN", { exact: true })).toHaveCount(0);

  // The owner's own choice is what marks the trim.
  await page.goto(`/garage/${vehicleId}`);
  await candidates.filter({ hasText: "PLUS 5G" }).getByRole("button", { name: "Это моя комплектация" }).click();
  await expect(page.getByRole("heading", { name: "Ваша комплектация" })).toBeVisible();
  const chosen = page.getByRole("listitem").filter({ hasText: "Ваша комплектация" });
  await expect(chosen).toHaveCount(1);
  await expect(chosen).toContainText("PLUS 5G");
  await expect(candidates).toHaveCount(1);
  expect(browserErrors, "errors in the browser console").toEqual([]);
});
