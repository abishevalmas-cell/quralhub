import { describe, expect, it } from "vitest";
import { ICON_NAMES } from "@/components/ui/icon";
import { USER_ROLES } from "@/lib/db/schema";
import { bottomItems, breadcrumbFor, currentHref, demoNote, initials, MODE_LABEL, navSections, showAssistant } from "../nav";

const hrefs = (role: Parameters<typeof navSections>[0]) => navSections(role).flatMap((s) => s.items.map((i) => i.href));

describe("navSections", () => {
  it("shows only public pages when logged out", () => {
    expect(hrefs(null)).toEqual(["/", "/models"]);
    expect(navSections(null)[0].title).toBe("Мой автомобиль");
  });

  it("gives customers and masters their own pages and no staff areas", () => {
    for (const role of ["customer", "master"] as const) {
      expect(hrefs(role)).toEqual(["/", "/garage", "/models", "/requests", "/orders"]);
      expect(hrefs(role).some((h) => h.startsWith("/sourcer") || h.startsWith("/admin"))).toBe(false);
    }
    expect(navSections("customer")[0].title).toBe("Мой автомобиль");
    expect(navSections("master")[0].title).toBe("Кабинет мастера");
  });

  it("puts the work queue first for staff and Управление only for admins", () => {
    const sourcer = navSections("sourcer");
    expect(sourcer[0]).toMatchObject({ title: "Подбор", zh: "采购" });
    expect(sourcer[0].items[0]).toMatchObject({ href: "/sourcer", label: "Заявки клиентов", zh: "采购", short: "Подбор" });
    expect(hrefs("sourcer")).toEqual(["/sourcer", "/sourcer/orders", "/", "/garage", "/models", "/requests", "/orders"]);
    expect(hrefs("sourcer")).not.toContain("/admin");
    expect(hrefs("admin")).toContain("/admin");
    // Staff's own requests are labelled apart from the queue.
    expect(sourcer[1].items.find((i) => i.href === "/requests")?.label).toBe("Мои заявки");
  });

  it("carries the counts on Заявки and Заказы", () => {
    const items = navSections("customer", { openRequests: 3, activeOrders: 1 })[0].items;
    expect(items.find((i) => i.href === "/requests")?.count).toBe(3);
    expect(items.find((i) => i.href === "/orders")?.count).toBe(1);
  });

  it("uses only icons that exist", () => {
    for (const role of [null, ...USER_ROLES]) {
      for (const item of [...navSections(role).flatMap((s) => s.items), ...bottomItems(role)]) expect(ICON_NAMES).toContain(item.icon);
    }
  });
});

describe("bottomItems", () => {
  it("fits five items at most and swaps Модели for the queue for staff", () => {
    for (const role of [null, ...USER_ROLES]) expect(bottomItems(role).length).toBeLessThanOrEqual(5);
    expect(bottomItems("customer").map((i) => i.href)).toEqual(["/", "/garage", "/models", "/requests", "/orders"]);
    expect(bottomItems("sourcer").map((i) => i.href)).toEqual(["/", "/garage", "/sourcer", "/requests", "/orders"]);
    expect(bottomItems("admin").map((i) => i.href)).toContain("/admin");
    expect(bottomItems(null).map((i) => i.href)).toEqual(["/", "/models", "/login"]);
  });
});

describe("currentHref", () => {
  const all = ["/", "/garage", "/sourcer", "/sourcer/orders"];
  it("marks the most specific section only", () => {
    expect(currentHref("/", all)).toBe("/");
    expect(currentHref("/garage/abc/catalog", all)).toBe("/garage");
    expect(currentHref("/sourcer/orders/5", all)).toBe("/sourcer/orders");
    expect(currentHref("/sourcer/requests/5", all)).toBe("/sourcer");
    expect(currentHref("/garagex", all)).toBeNull();
    expect(currentHref(null, all)).toBeNull();
  });
});

describe("breadcrumbFor", () => {
  const labels = (path: string) => breadcrumbFor(path).map((c) => c.label);
  it("maps known routes to Russian labels", () => {
    expect(labels("/")).toEqual(["Мой гараж", "Поиск деталей"]);
    expect(labels("/garage")).toEqual(["Мой гараж"]);
    expect(labels("/garage/new")).toEqual(["Мой гараж", "Новая машина"]);
    expect(labels("/garage/123/catalog")).toEqual(["Мой гараж", "Машина", "Каталог"]);
    expect(labels("/models")).toEqual(["Модели"]);
    expect(labels("/models/zeekr-x")).toEqual(["Модели", "Zeekr X"]);
    expect(labels("/models/byd-song-l")).toEqual(["Модели", "BYD Song L"]);
    expect(labels("/models/nope")).toEqual(["Модели", "Модель"]);
    expect(labels("/requests")).toEqual(["Заявки"]);
    expect(labels("/requests/new")).toEqual(["Заявки", "Новая заявка"]);
    expect(labels("/requests/42")).toEqual(["Заявки", "Заявка"]);
    expect(labels("/orders/7")).toEqual(["Заказы", "Заказ"]);
    expect(labels("/sourcer/orders/7")).toEqual(["Подбор 采购", "Заказы клиентов 订单", "Заказ"]);
    expect(labels("/sourcer/requests/7")).toEqual(["Подбор 采购", "Заявка"]);
    expect(labels("/profile")).toEqual(["Профиль"]);
    expect(labels("/nowhere")).toEqual([]);
  });

  it("links earlier crumbs and leaves the current page without a link", () => {
    expect(breadcrumbFor("/")).toEqual([{ label: "Мой гараж", href: "/garage" }, { label: "Поиск деталей" }]);
    expect(breadcrumbFor("/garage/123/catalog")).toEqual([
      { label: "Мой гараж", href: "/garage" },
      { label: "Машина", href: "/garage/123" },
      { label: "Каталог" },
    ]);
    expect(breadcrumbFor("/garage")).toEqual([{ label: "Мой гараж" }]);
  });

  it("does not put the home page under a garage the visitor does not have", () => {
    expect(breadcrumbFor("/", { garage: false })).toEqual([{ label: "Поиск деталей" }]);
    expect(breadcrumbFor("/?model=byd-han", { garage: false })).toEqual([{ label: "Поиск деталей" }]);
    expect(breadcrumbFor("/garage", { garage: false })).toEqual([{ label: "Мой гараж" }]);
  });
});

describe("showAssistant", () => {
  it("hides the assistant on login and staff pages", () => {
    expect(showAssistant("/")).toBe(true);
    expect(showAssistant("/garage/1")).toBe(true);
    expect(showAssistant("/login")).toBe(false);
    expect(showAssistant("/sourcer")).toBe(false);
    expect(showAssistant("/sourcer/orders/1")).toBe(false);
    expect(showAssistant("/admin")).toBe(false);
    expect(showAssistant("/administrator-guide")).toBe(true);
    // A request already is the way to ask: the form and the thread.
    expect(showAssistant("/requests")).toBe(true);
    expect(showAssistant("/requests/new")).toBe(false);
    expect(showAssistant("/requests/42")).toBe(false);
  });
});

describe("labels", () => {
  it("names every role's mode", () => {
    expect(USER_ROLES.map((r) => MODE_LABEL[r])).toEqual(["Покупатель", "Мастер", "Подборщик", "Администратор"]);
  });

  it("takes initials from the name only", () => {
    expect(initials("Алмас Абишев")).toBe("АА");
    expect(initials("  мария  ")).toBe("М");
    expect(initials("СТО «Мотор» Алматы")).toBe("СМ");
    expect(initials("")).toBeNull();
    expect(initials(null)).toBeNull();
    expect(initials("+7 701")).toBeNull();
  });

  it("says when the data is not real", () => {
    expect(demoNote({ demo: false, fixture: false })).toBeNull();
    expect(demoNote({ demo: false, fixture: true })).toMatch(/тестовых/);
    expect(demoNote({ demo: true, fixture: true })).toMatch(/Демо-стенд.*тестовых/);
    expect(demoNote({ demo: true, fixture: false })).toMatch(/Демо-стенд/);
  });
});
