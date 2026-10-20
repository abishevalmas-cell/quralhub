import { expect, test, type BrowserContext, type Page, type Response } from "@playwright/test";
import { FIXTURE_VINS } from "../lib/providers/fixture";
import {
  adminStatePath,
  collectBrowserErrors,
  getAsUser,
  login,
  newPhone,
  newUserContext,
  sessionHeaders,
  TINY_PNG,
  uniqueTag,
  uuidFrom,
} from "./helpers";

// One customer's request from the garage to a delivered order, with the administrator as the sourcer in a second
// browser context. The tests depend on each other and run in order.
test.describe.configure({ mode: "serial" });

// The Deepal fixture decodes to exactly one trim, so its catalog parts can be "Подходит по VIN".
const VIN = FIXTURE_VINS.deepalS7;
const PART = { name: "Front brake pad kit", oe: "C385B120301-0100" };

const tag = uniqueTag("e2e");
// Entered by the sourcer as INTERNAL data; none of it may reach the customer.
const secret = {
  supplierName: `Guangzhou Parts ${uniqueTag("sup")}`,
  supplierUrl: `https://supplier.example/item/${uniqueTag("url")}`,
  internalNote: `Закупка со скидкой ${uniqueTag("note")}`,
  // Typed as "1873,46", stored as "1873.46", shown to staff as "1 873,46 ¥".
  priceCnyTyped: "1873,46",
  priceCnyForms: ["1873.46", "1873,46"],
};
// Shown to the customer in the offer: proves the checked pages really contain the offer.
const customerNote = `Оригинал с дилерского склада, ${tag}`;

const flow = {
  phone: newPhone(),
  vehicleId: "",
  requestId: "",
  requestNumber: 0,
  photoId: "",
  priceText: "",
  orderId: "",
};

let customer: BrowserContext;
let customerPage: Page;
let admin: BrowserContext;
let adminPage: Page;
// Uncaught exceptions and console errors on the customer's and the sourcer's pages.
const browserErrors: string[] = [];
// Every document, RSC payload and JSON answer the customer's browser received during the flow.
const customerResponses: Promise<{ url: string; type: string; body: string } | null>[] = [];

function capture(response: Response) {
  const type = response.headers()["content-type"] ?? "";
  if (!/text\/html|text\/x-component|application\/json/.test(type)) return;
  customerResponses.push(
    response
      .text()
      .then((body) => ({ url: response.url(), type, body }))
      .catch(() => null),
  );
}

// Whitespace inside numbers differs between formatters ("1 873,46" with a no-break space, "1873,46"), so it is
// dropped before searching. \s covers the no-break spaces too.
const squash = (text: string) => text.replace(/\s/g, "");

function expectNoSecrets(body: string, where: string) {
  for (const value of [secret.supplierName, secret.supplierUrl, secret.internalNote])
    expect(body.includes(value), `${where} contains "${value}"`).toBe(false);
  const flat = squash(body);
  for (const value of secret.priceCnyForms) expect(flat.includes(value), `${where} contains the yuan price ${value}`).toBe(false);
  for (const field of ["supplierName", "supplierUrl", "priceCny", "costKzt", "internalNote"])
    expect(body.includes(field), `${where} has the internal field ${field}`).toBe(false);
}

test.beforeAll(async ({ browser }, testInfo) => {
  customer = await newUserContext(browser, testInfo);
  customer.on("response", capture);
  customerPage = await customer.newPage();
  admin = await newUserContext(browser, testInfo, adminStatePath());
  adminPage = await admin.newPage();
  collectBrowserErrors(customerPage, browserErrors);
  collectBrowserErrors(adminPage, browserErrors);
});

test.afterEach(() => {
  expect(browserErrors, "errors in the browser console").toEqual([]);
});

test.afterAll(async () => {
  await customer?.close();
  await admin?.close();
});

test("customer adds a car, finds a part in the catalog and sends a request with a photo", async () => {
  const page = customerPage;
  await login(page, flow.phone, "/garage/new");

  await page.getByLabel("VIN", { exact: true }).fill(VIN);
  await page.getByRole("button", { name: "Добавить по VIN" }).click();
  await page.waitForURL(/\/garage\/[0-9a-f-]{36}$/);
  flow.vehicleId = uuidFrom(page.url(), "/garage");

  // Decode status: one trim, decoded; the synthetic catalog says so.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Deepal S7");
  await expect(page.getByText("Расшифрован", { exact: true })).toBeVisible();
  await expect(page.getByText("Режим примеров: данные синтетические")).toBeVisible();
  await expect(page.getByText(VIN, { exact: true })).toBeVisible();

  // Catalog: group → subgroup → last-level group with parts.
  await page.getByRole("link", { name: /B1 Chassis/ }).click();
  await expect(page.getByText("Каталог · уровень 2")).toBeVisible();
  await page.getByRole("link", { name: /Brakes/ }).click();
  await expect(page.getByText("Каталог · уровень 3")).toBeVisible();
  await page.getByRole("link", { name: /Front brake system/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Front brake system");

  const part = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: PART.name }) });
  await expect(part).toHaveCount(1);
  await expect(part.getByText(PART.oe, { exact: true })).toBeVisible();
  await expect(part.getByText("Подходит по VIN")).toBeVisible();
  await part.getByRole("link", { name: "Запросить цену" }).click();

  // The request form arrives filled in from the catalog.
  await page.waitForURL(/\/requests\/new\?/);
  await expect(page.getByLabel("Машина")).toHaveValue(flow.vehicleId);
  await expect(page.getByLabel("Что нужно")).toHaveValue(PART.name);
  await expect(page.getByLabel("Номер OE, если знаете")).toHaveValue(PART.oe);
  await page.getByLabel("Подробности").fill(`Скрипят колодки. Метка теста ${tag}`);
  await page.getByRole("button", { name: "Отправить заявку" }).click();

  await page.waitForURL(/\/requests\/[0-9a-f-]{36}\?created=1$/);
  flow.requestId = uuidFrom(page.url(), "/requests");
  await expect(page.getByText("Заявка отправлена")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(PART.name);
  const eyebrow = await page.getByText(/^Заявка №\d+/).first().textContent();
  flow.requestNumber = Number(/№(\d+)/.exec(eyebrow ?? "")?.[1]);
  expect(flow.requestNumber).toBeGreaterThan(0);

  // Photo: the gallery input is visually hidden behind its label.
  await page.getByLabel("Добавить фото").setInputFiles({ name: "old-pads.png", mimeType: "image/png", buffer: TINY_PNG });
  const thumb = page.getByRole("img", { name: "old-pads.png" });
  await expect(thumb).toBeVisible();
  await expect.poll(() => thumb.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(1);
  const photoHref = (await page.getByRole("link").filter({ has: thumb }).getAttribute("href")) ?? "";
  flow.photoId = /^\/api\/attachments\/([0-9a-f-]{36})$/.exec(photoHref)?.[1] ?? "";
  expect(flow.photoId).not.toBe("");
  await expect(page.getByText("Фото прикреплены. Подборщик ответит в чате ниже.")).toBeVisible();

  // The request is listed in «Заявки», reached through the visible navigation (top bar or bottom bar).
  await page.getByRole("navigation", { name: "Разделы" }).getByRole("link", { name: "Заявки" }).click();
  await page.waitForURL(/\/requests$/);
  const item = page.getByRole("link").filter({ hasText: `№${flow.requestNumber}` }).filter({ hasText: PART.name });
  await expect(item).toBeVisible();
  await expect(item.getByText("Новая")).toBeVisible();
  await expect(item.getByText("Deepal S7")).toBeVisible();
});

test("sourcer takes the request, prices an offer in yuan and publishes it", async () => {
  const page = adminPage;
  await page.goto("/sourcer");
  const card = page.getByRole("article").filter({ hasText: new RegExp(`№${flow.requestNumber}(?!\\d)`) });
  await expect(card).toHaveCount(1);
  await expect(card.getByText("1 фото")).toBeVisible();
  await card.getByRole("button", { name: /Взять в работу/ }).click();
  await page.waitForURL(new RegExp(`/sourcer/requests/${flow.requestId}$`));
  await expect(page.getByText("Ведёт: вы")).toBeVisible();

  await page.getByRole("link", { name: /Новое предложение/ }).click();
  const form = page.getByRole("form", { name: "Новое предложение" });
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Название для клиента")).toHaveValue(PART.name);
  await expect(form.getByLabel("Номер OE")).toHaveValue(PART.oe);
  await form.getByLabel("Производитель").fill("Deepal");
  await form.getByLabel("Цена в Китае, ¥").fill(secret.priceCnyTyped);
  await form.getByLabel("Вес 1 шт., кг").fill("0,8");
  await form.getByLabel("От", { exact: true }).fill("12");
  await form.getByLabel("До", { exact: true }).fill("18");
  await form.getByLabel("Комментарий для клиента").fill(customerNote);
  await form.getByLabel("Поставщик").fill(secret.supplierName);
  await form.getByLabel("Ссылка на товар").fill(secret.supplierUrl);
  await form.getByLabel("Внутренняя заметка").fill(secret.internalNote);

  // Quote preview: computed on the server from the yuan price, weight and the default pricing settings.
  const preview = form.getByRole("region", { name: "Расчёт цены" });
  await expect(preview.getByText("Цена по расчёту")).toBeVisible();
  await expect(preview).toContainText("Курс 67,75 ₸ за 1 ¥");
  for (const line of ["Закупка", "Доставка", "Себестоимость", "Маржа"])
    await expect(preview.getByText(line).first()).toBeVisible();
  const quoted = preview.locator("dt", { hasText: "Цена по расчёту" }).locator("xpath=following-sibling::dd[1]");
  flow.priceText = ((await quoted.textContent()) ?? "").trim();
  expect(flow.priceText).toMatch(/^\d[\d\s]* ₸$/);

  await form.getByRole("button", { name: /Сохранить черновик/ }).click();
  await expect(form).toBeHidden();
  const draft = page.getByRole("article", { name: PART.name });
  await expect(draft.getByText(/^Черновик/)).toBeVisible();
  await expect(draft).toContainText("1 873,46 ¥");
  await expect(draft).toContainText(secret.supplierName);

  await page.getByRole("button", { name: /Отправить клиенту 1 черновик/ }).click();
  await expect(page.getByRole("heading", { name: /Видит клиент/ })).toBeVisible();
  await expect(page.getByRole("article", { name: PART.name }).getByText(/^У клиента/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Отправить клиенту/ })).toHaveCount(0);
});

test("customer accepts the offer, the order is delivered and the customer confirms the fit", async () => {
  const page = customerPage;
  await page.goto(`/requests/${flow.requestId}`);
  await expect(page.getByText("Есть предложения", { exact: true }).first()).toBeVisible();
  const offer = page.getByRole("article", { name: PART.name });
  await expect(offer).toContainText(flow.priceText);
  await expect(offer).toContainText(customerNote);
  await expect(offer).toContainText("12–18");
  await offer.getByRole("button", { name: "Выбрать этот вариант" }).click();
  await offer.getByRole("button", { name: `Подтвердить заказ на ${flow.priceText}` }).click();

  await page.waitForURL(/\/orders\/[0-9a-f-]{36}$/);
  flow.orderId = uuidFrom(page.url(), "/orders");
  await expect(page.getByText(/^Заказ №\d+/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(PART.name);
  await expect(page.getByText("Ожидает оплаты", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Оплата пока принимается вручную")).toBeVisible();

  // The administrator moves the order along the delivery line; every step is confirmed in a second step.
  const staff = adminPage;
  await staff.goto(`/sourcer/orders/${flow.orderId}`);
  for (const step of [
    "Оплата получена",
    "Выкуплен у поставщика",
    "На складе консолидации",
    "Отправлен",
    "Прибыл в город",
    "Выдан клиенту",
  ]) {
    await staff.getByRole("button", { name: new RegExp(`^${step}`) }).click();
    await staff.getByRole("button", { name: "Сохранить и уведомить клиента" }).click();
    await expect(staff.getByRole("button", { name: "Сохранить и уведомить клиента" })).toHaveCount(0);
  }
  await expect(staff.getByRole("button", { name: /^Оформить возврат/ })).toBeVisible();
  await expect(staff.getByText("Клиент ещё не ответил, подошла ли деталь.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Выдан", { exact: true }).first()).toBeVisible();
  const fit = page.getByRole("group", { name: "Деталь подошла?" });
  await expect(fit).toBeVisible();
  await fit.getByText("Да, подошла").click();
  await page.getByRole("button", { name: "Отправить ответ" }).click();
  await expect(page.getByText("Вы ответили: деталь подошла")).toBeVisible();

  await page.getByRole("link", { name: `№${flow.requestNumber}`, exact: true }).click();
  await page.waitForURL(new RegExp(`/requests/${flow.requestId}$`));
  await expect(page.getByText(/Заказ №\d+ создан/)).toBeVisible();
});

test("customer pages never carry the supplier or the yuan price", async () => {
  // The staff page does show them: the values below were really saved.
  const staffHtml = await (await getAsUser(admin, `/sourcer/requests/${flow.requestId}`)).text();
  expect(staffHtml).toContain(secret.supplierName);
  expect(staffHtml).toContain(secret.supplierUrl);
  expect(staffHtml).toContain(secret.internalNote);
  expect(squash(staffHtml)).toContain(secret.priceCnyForms[1]);

  const pages = [`/requests/${flow.requestId}`, `/orders/${flow.orderId}`, "/requests", "/orders"];
  for (const path of pages) {
    const html = await getAsUser(customer, path);
    expect(html.status(), path).toBe(200);
    const htmlBody = await html.text();
    expect(htmlBody, `${path} HTML`).toContain(PART.name);
    expectNoSecrets(htmlBody, `${path} HTML`);

    // The RSC payload is what client navigation fetches; it holds every prop passed to client components.
    const rsc = await getAsUser(customer, path, { RSC: "1" });
    expect(rsc.status(), `${path} RSC`).toBe(200);
    expect(rsc.headers()["content-type"], `${path} RSC`).toContain("text/x-component");
    const rscBody = await rsc.text();
    expect(rscBody, `${path} RSC`).toContain(PART.name);
    expectNoSecrets(rscBody, `${path} RSC`);
  }
  for (const path of [`/requests/${flow.requestId}`, `/orders/${flow.orderId}`]) {
    const htmlBody = await (await getAsUser(customer, path)).text();
    expect(htmlBody, `${path} shows the customer note`).toContain(tag);
  }

  // The JSON API the customer's browser can call.
  for (const path of [`/api/requests/${flow.requestId}`, `/api/orders/${flow.orderId}`]) {
    const api = await getAsUser(customer, path);
    expect(api.status(), path).toBe(200);
    const body = await api.text();
    expect(body, path).toContain(PART.name);
    expectNoSecrets(body, path);
  }

  // And everything the customer's browser actually received during the whole flow.
  const received = (await Promise.all(customerResponses)).filter((r) => r !== null);
  expect(received.some((r) => r.type.includes("text/x-component"))).toBe(true);
  expect(received.some((r) => r.body.includes(customerNote))).toBe(true);
  for (const r of received) expectNoSecrets(r.body, `${r.url} (${r.type})`);
});

test("a second customer gets «not found» for the first customer's request and order", async ({ browser }, testInfo) => {
  const other = await newUserContext(browser, testInfo);
  try {
    const page = await other.newPage();
    collectBrowserErrors(page, browserErrors);
    await login(page, newPhone(), "/requests");
    await expect(page.getByRole("heading", { name: "Заявок пока нет" })).toBeVisible();

    for (const path of [`/requests/${flow.requestId}`, `/requests/${flow.requestNumber}`, `/orders/${flow.orderId}`]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
      await expect(page.getByText(PART.name)).toHaveCount(0);
    }

    // The API and the photo answer the same way, so nothing tells that the request exists.
    for (const path of [`/api/requests/${flow.requestId}`, `/api/orders/${flow.orderId}`, `/api/attachments/${flow.photoId}`]) {
      const response = await getAsUser(other, path);
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).not.toContain(PART.name);
    }
    const headers = await sessionHeaders(other);
    const message = await other.request.post(`/api/requests/${flow.requestId}/messages`, {
      headers,
      data: { body: "Здравствуйте" },
    });
    expect(message.status()).toBe(404);

    // Staff screens and actions stay closed to a customer.
    await page.goto(`/sourcer/requests/${flow.requestId}`);
    await expect(page.getByText(PART.name)).toHaveCount(0);
    expect((await getAsUser(other, `/api/sourcer/requests/${flow.requestId}`)).status()).toBe(403);
    const take = await other.request.patch(`/api/sourcer/requests/${flow.requestId}`, {
      headers,
      data: { action: "take", version: 1 },
    });
    expect(take.status()).toBe(403);
  } finally {
    await other.close();
  }
});
