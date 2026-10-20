import { expect, test } from "@playwright/test";
import { FIXTURE_VINS } from "../lib/providers/fixture";
import { collectBrowserErrors, login, newPhone } from "./helpers";

// The vehicle stage of the home page: the car with "+" hotspots, the parts behind a hotspot, and the garage car on
// the stage after adding it by model.

test("the home page shows the vehicle stage, and the front hotspot lists its parts", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Найдём нужную деталь");

  // Without a garage the stage shows the most common model, with eight hotspots.
  const stage = page.locator("#stage");
  await expect(stage).toHaveCount(1);
  const picture = stage.getByRole("region", { name: "BYD Song Plus DM-i" });
  await expect(picture).toBeVisible();
  await expect(picture.locator("button[aria-pressed]")).toHaveCount(8);
  await expect(picture.getByRole("img", { name: /BYD Song Plus DM-i/ })).toBeVisible();

  const front = picture.getByRole("button", { name: "Передний бампер и фары" });
  await expect(front).toHaveAttribute("aria-pressed", "false");
  await front.click();
  await expect(front).toHaveAttribute("aria-pressed", "true");

  const panel = page.getByRole("region", { name: "Передний бампер и фары" });
  await expect(panel).toBeVisible();
  const headlight = panel.getByRole("link", { name: "Подобрать: Фара" });
  await expect(headlight).toBeVisible();
  await expect(panel.getByRole("link", { name: "Подобрать: Бампер" })).toBeVisible();
  // A visitor signs in first; the request form keeps the part.
  await expect(headlight).toHaveAttribute("href", /^\/login\?next=%2Frequests%2Fnew%3F/);

  // The other areas are one tap away without going back to the picture.
  await panel.getByRole("group", { name: "Другие узлы" }).getByRole("button", { name: "Задние фонари и бампер" }).click();
  const rear = page.getByRole("region", { name: "Задние фонари и бампер" });
  await expect(rear).toBeVisible();
  await expect(rear.getByRole("link", { name: /^Подобрать: / }).first()).toBeVisible();
  await expect(picture.getByRole("button", { name: "Задние фонари и бампер" })).toHaveAttribute("aria-pressed", "true");
  await expect(front).toHaveAttribute("aria-pressed", "false");

  // No price is made up before a sourcer has found the part.
  await expect(page.getByText("Цена после подбора").first()).toBeVisible();
  await expect(page.locator("main").getByText(/\d\s?\d{3}\s?₸/)).toHaveCount(0);
  expect(browserErrors, "errors in the browser console").toEqual([]);
});

test("a customer adds a car by choosing its model, and the home stage follows the chosen car", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await login(page, newPhone(), "/garage/new");

  await page.getByRole("tab", { name: "Выбрать модель" }).click();
  await page.getByLabel("Найти модель").fill("Monjaro");
  await page.getByRole("list", { name: "Найденные модели" }).getByRole("button", { name: /Geely Monjaro/ }).click();
  await expect(page.getByRole("heading", { name: "Geely Monjaro" })).toBeVisible();
  // The year is the owner's to say: nothing is preselected.
  const year = page.getByLabel("Год выпуска");
  await expect(year).toHaveValue("");
  await year.selectOption("2023");
  await page.getByRole("radio", { name: "Синий" }).check({ force: true });
  await page.getByRole("button", { name: "Добавить в гараж" }).click();

  await page.waitForURL(/\/garage\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Monjaro/);
  await expect(page.getByText("Без VIN", { exact: true }).first()).toBeVisible();
  // A car added by model gets no catalog promise: parts are checked by a sourcer.
  await expect(page.getByText("Каталог по VIN", { exact: true })).toHaveCount(0);

  // A second car, by VIN; it becomes the car of the home page.
  await page.goto("/garage/new");
  await page.getByLabel("VIN", { exact: true }).fill(FIXTURE_VINS.deepalS7);
  await page.getByRole("button", { name: "Добавить по VIN" }).click();
  await page.waitForURL(/\/garage\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Deepal S7");

  await page.goto("/");
  const stage = page.locator("#stage");
  await expect(stage).toHaveCount(1);
  await expect(stage.getByRole("heading", { level: 2 })).toHaveText("Deepal S7");

  // Switching cars replaces the stage; it must not leave the previous car's stage behind.
  await page.getByRole("button", { name: /: сменить машину$/ }).click();
  const switcher = page.getByRole("dialog", { name: "Для какой машины ищем?" });
  await expect(switcher).toBeVisible();
  await switcher.getByRole("region", { name: "Мой гараж" }).getByRole("button", { name: /Monjaro/ }).click();
  await expect(switcher).toBeHidden();
  await expect(stage).toHaveCount(1);
  await expect(stage.getByRole("heading", { level: 2 })).toHaveText(/Monjaro/);
  await expect(page.getByRole("heading", { name: "Детали для вашего авто" })).toHaveCount(1);
  expect(browserErrors, "errors in the browser console").toEqual([]);
});
