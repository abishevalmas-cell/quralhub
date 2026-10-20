import { afterEach, describe, expect, it } from "vitest";
import { appBaseUrl, htmlToPlain, renderEvent, type NotificationEvent } from "@/lib/notify/events";

const APP = "https://tetix.example";
// Synthetic VIN with a valid ISO 3779 check digit; never a real customer's.
const VIN = "LTXSYN000R0012345";
const previous = process.env.APP_URL;
afterEach(() => {
  if (previous === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = previous;
});

describe("renderEvent", () => {
  it("renders a received request with a link", () => {
    const text = renderEvent({ type: "request_received", requestNumber: 1024 }, APP);
    expect(text).toBe(
      [
        "<b>Мы приняли заявку №1024</b>",
        "Подборщик проверит, что подходит к вашей машине, и пришлёт варианты с ценой и сроком.",
        "",
        "Открыть заявку: https://tetix.example/requests/1024",
      ].join("\n"),
    );
  });

  it("escapes the clarification question", () => {
    const text = renderEvent(
      { type: "request_clarification", requestNumber: 5, question: `Левая или правая? <a href="x">&</a>` },
      APP,
    );
    expect(text).toContain("Левая или правая? &lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
    expect(text).not.toContain('<a href="x">');
    expect(text).toContain("Ответить: https://tetix.example/requests/5");
  });

  it("keeps line breaks in a question but drops control characters and lone surrogates", () => {
    const question = "Какая сторона?\r\n\r\n\r\n\r\nЛевая\u0000 или\u001b[31m правая\uD800?";
    const text = renderEvent({ type: "request_clarification", requestNumber: 5, question }, APP);
    expect(text).toContain("Какая сторона?\n\nЛевая или [31m правая\uFFFD?");
    expect(text).not.toMatch(/[\u0000-\u0008\u000b-\u001f\r]/);
    expect(() => encodeURIComponent(text)).not.toThrow();
  });

  it("falls back to a generic line when the question is empty", () => {
    const text = renderEvent({ type: "request_clarification", requestNumber: 5, question: "   " }, APP);
    expect(text).toContain("Подборщику нужно уточнение. Откройте заявку.");
  });

  it("cuts very long user text without splitting entities", () => {
    const text = renderEvent({ type: "request_clarification", requestNumber: 5, question: "&".repeat(5000) }, APP);
    expect(text.length).toBeLessThan(4096);
    expect(text).toMatch(/(&amp;)+…/);
    expect(text).not.toMatch(/&am…|&a…|&…/);
  });

  it("stays under Telegram's limit for every event with oversized input", () => {
    const huge = "<&\">".repeat(3000);
    const events: NotificationEvent[] = [
      { type: "request_received", requestNumber: Number.MAX_SAFE_INTEGER },
      { type: "request_clarification", requestNumber: 1, question: huge },
      { type: "request_offered", requestNumber: 1, offerCount: Number.MAX_SAFE_INTEGER },
      { type: "order_status", orderNumber: 1, statusLabel: huge },
      { type: "staff_new_request", requestNumber: 1, vehicleLabel: huge, title: huge },
      { type: "request_message", requestNumber: 1, body: huge },
      { type: "staff_customer_reply", requestNumber: 1, title: huge, body: huge, answered: true },
      { type: "staff_offer_accepted", requestNumber: 1, orderNumber: 2, offerTitle: huge, totalLabel: huge },
      { type: "staff_order_issue", orderNumber: 1, offerTitle: huge, comment: huge },
      { type: "request_cancelled", requestNumber: 1, reason: huge },
      { type: "request_closed", requestNumber: 1, reason: huge },
      { type: "staff_request_cancelled", requestNumber: 1, title: huge },
    ];
    for (const event of events) {
      const text = renderEvent(event, APP + "/" + "a".repeat(500));
      expect(text.length).toBeLessThanOrEqual(4096);
      expect(text).not.toContain("<&");
    }
  });

  it("masks VINs in user text", () => {
    const text = renderEvent(
      { type: "staff_new_request", requestNumber: 3, vehicleLabel: `Geely ${VIN}`, title: `Фильтр для ${VIN.toLowerCase()}` },
      APP,
    );
    expect(text).toContain("Geely LTX…2345");
    expect(text).toContain("Фильтр для ltx…2345");
    expect(text.toUpperCase()).not.toContain(VIN);
  });

  it("pluralizes offer counts", () => {
    const render = (offerCount: number) => renderEvent({ type: "request_offered", requestNumber: 9, offerCount }, APP);
    expect(render(1)).toContain("Мы нашли 1 вариант по заявке №9");
    expect(render(3)).toContain("Мы нашли 3 варианта по заявке №9");
    expect(render(5)).toContain("Мы нашли 5 вариантов по заявке №9");
    expect(render(11)).toContain("Мы нашли 11 вариантов по заявке №9");
    expect(render(21)).toContain("Мы нашли 21 вариант по заявке №9");
    expect(render(0)).toContain("Мы подобрали варианты по заявке №9");
    expect(render(Number.NaN)).toContain("Мы подобрали варианты по заявке №9");
    expect(render(1)).toContain("Выбрать: https://tetix.example/requests/9");
  });

  it("renders order status", () => {
    const text = renderEvent({ type: "order_status", orderNumber: 77, statusLabel: "В пути\nиз Китая" }, APP);
    expect(text).toContain("<b>Заказ №77</b>");
    expect(text).toContain("Статус: В пути из Китая");
    expect(text).toContain("Открыть заказ: https://tetix.example/orders/77");
    expect(renderEvent({ type: "order_status", orderNumber: 77, statusLabel: "" }, APP)).toContain("Статус заказа изменился.");
  });

  it("renders a staff notification with a Chinese label", () => {
    const text = renderEvent(
      { type: "staff_new_request", requestNumber: 12, vehicleLabel: "BYD Song Plus 2023", title: "Колодки <передние>" },
      APP,
    );
    expect(text).toContain("<b>Новая заявка №12</b> · 新询价");
    expect(text).toContain("\nBYD Song Plus 2023\n");
    expect(text).toContain("\nКолодки &lt;передние&gt;\n");
    expect(text).toContain("Взять в работу: https://tetix.example/sourcer/requests/12");
    const empty = renderEvent({ type: "staff_new_request", requestNumber: 12, vehicleLabel: null, title: "" }, APP);
    expect(empty).toContain("Клиент не указал машину");
    expect(empty).toContain("Без названия");
  });

  it("renders a staff message to the customer with a reply link", () => {
    const text = renderEvent({ type: "request_message", requestNumber: 8, body: "Реквизиты: <b>Kaspi</b>" }, APP);
    expect(text).toContain("<b>Сообщение по заявке №8</b>");
    expect(text).toContain("Реквизиты: &lt;b&gt;Kaspi&lt;/b&gt;");
    expect(text).toContain("Ответить: https://tetix.example/requests/8");
    expect(renderEvent({ type: "request_message", requestNumber: 8, body: " " }, APP)).toContain("Подборщик написал вам");
  });

  it("renders staff follow-ups with their own headings and links", () => {
    const reply = renderEvent(
      { type: "staff_customer_reply", requestNumber: 4, title: "Фара левая", body: `Да, левая. VIN ${VIN}`, answered: true },
      APP,
    );
    expect(reply).toContain("<b>Клиент ответил на вопрос по заявке №4</b> · 客户回复");
    expect(reply).toContain("\nФара левая\nДа, левая. VIN LTX…2345\n");
    expect(reply).toContain("Открыть заявку: https://tetix.example/sourcer/requests/4");
    expect(
      renderEvent({ type: "staff_customer_reply", requestNumber: 4, title: "Фара", body: "Ещё фото", answered: false }, APP),
    ).toContain("<b>Клиент написал по заявке №4</b>");

    const accepted = renderEvent(
      { type: "staff_offer_accepted", requestNumber: 4, orderNumber: 9, offerTitle: "Фара OEM", totalLabel: "186 000 ₸" },
      APP,
    );
    expect(accepted).toContain("<b>Новый заказ №9</b> · 新订单");
    expect(accepted).toContain("Клиент выбрал вариант по заявке №4: Фара OEM");
    expect(accepted).toContain("Сумма: 186 000 ₸");
    expect(accepted).toContain("Открыть заказ: https://tetix.example/sourcer/orders/9");

    const issue = renderEvent({ type: "staff_order_issue", orderNumber: 9, offerTitle: "Фара OEM", comment: "Другой разъём" }, APP);
    expect(issue).toContain("<b>Не подошла деталь, заказ №9</b> · 配件不匹配");
    expect(issue).toContain("Комментарий клиента: Другой разъём");
    expect(issue).toContain("Открыть заказ: https://tetix.example/sourcer/orders/9");
    expect(renderEvent({ type: "staff_order_issue", orderNumber: 9, offerTitle: "x", comment: null }, APP)).toContain(
      "Клиент не оставил комментарий.",
    );
  });

  it("tells the customer why staff cancelled or closed a request, and the sourcer that the customer cancelled", () => {
    const cancelled = renderEvent({ type: "request_cancelled", requestNumber: 7, reason: "Детали нет <в наличии>" }, APP);
    expect(cancelled).toContain("<b>Заявка №7 отменена</b>");
    expect(cancelled).toContain("Причина: Детали нет &lt;в наличии&gt;");
    expect(cancelled).toContain("Открыть заявку: https://tetix.example/requests/7");
    expect(renderEvent({ type: "request_cancelled", requestNumber: 7, reason: null }, APP)).toContain("Подборщик отменил заявку.");
    const closed = renderEvent({ type: "request_closed", requestNumber: 8, reason: null }, APP);
    expect(closed).toContain("<b>Заявка №8 закрыта</b>");
    expect(closed).toContain("Подборщик закрыл заявку.");
    const staff = renderEvent({ type: "staff_request_cancelled", requestNumber: 9, title: "Фара левая" }, APP);
    expect(staff).toContain("<b>Клиент отменил заявку №9</b>");
    expect(staff).toContain("Фара левая");
    expect(staff).toContain("Открыть заявку: https://tetix.example/sourcer/requests/9");
  });

  it("does not trust malformed numbers and links to the list instead", () => {
    const text = renderEvent({ type: "request_received", requestNumber: "1/../../admin" as unknown as number }, APP);
    expect(text).not.toContain("admin");
    expect(text).toContain("заявку №—");
    expect(text).toMatch(/Открыть заявку: https:\/\/tetix\.example\/requests$/);
    expect(renderEvent({ type: "order_status", orderNumber: -5, statusLabel: "x" }, APP)).toMatch(/\/orders$/);
    expect(renderEvent({ type: "staff_new_request", requestNumber: 1.5, vehicleLabel: null, title: "x" }, APP)).toMatch(
      /\/sourcer\/requests$/,
    );
  });

  it("escapes the app URL", () => {
    const text = renderEvent({ type: "request_received", requestNumber: 1 }, "https://tetix.example/a&b/<x>");
    expect(text).toContain("https://tetix.example/a&amp;b/%3Cx%3E/requests/1");
  });
});

describe("appBaseUrl", () => {
  it("reads APP_URL and falls back to localhost", () => {
    delete process.env.APP_URL;
    expect(appBaseUrl()).toBe("http://localhost:3000");
    expect(renderEvent({ type: "request_received", requestNumber: 1 })).toContain("http://localhost:3000/requests/1");
    process.env.APP_URL = "https://tetix.kz/";
    expect(appBaseUrl()).toBe("https://tetix.kz");
    expect(renderEvent({ type: "request_received", requestNumber: 1 })).toContain("https://tetix.kz/requests/1");
  });

  it("normalizes and rejects unsafe values", () => {
    expect(appBaseUrl("javascript:alert(1)")).toBe("http://localhost:3000");
    expect(appBaseUrl("not a url")).toBe("http://localhost:3000");
    expect(appBaseUrl("  ")).toBe("http://localhost:3000");
    expect(appBaseUrl("https://user:pass@tetix.kz/app/?x=1#y")).toBe("https://tetix.kz/app");
  });
});

describe("htmlToPlain", () => {
  it("strips tags and unescapes entities once", () => {
    expect(htmlToPlain("<b>A &lt;b&gt; &amp; &quot;c&quot;</b>")).toBe('A <b> & "c"');
    expect(htmlToPlain("&amp;lt;")).toBe("&lt;");
  });
});
