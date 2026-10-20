import { pluralRu } from "@/lib/utils";
import { maskVins } from "./mask";
import { escapeHtml } from "./telegram";

export type NotificationEvent =
  | { type: "request_received"; requestNumber: number }
  | { type: "request_clarification"; requestNumber: number; question: string }
  | { type: "request_offered"; requestNumber: number; offerCount: number }
  | { type: "request_message"; requestNumber: number; body: string }
  | { type: "request_cancelled"; requestNumber: number; reason: string | null }
  | { type: "request_closed"; requestNumber: number; reason: string | null }
  | { type: "order_status"; orderNumber: number; statusLabel: string }
  | { type: "staff_new_request"; requestNumber: number; vehicleLabel: string | null; title: string }
  | { type: "staff_customer_reply"; requestNumber: number; title: string; body: string; answered: boolean }
  | { type: "staff_request_cancelled"; requestNumber: number; title: string }
  | { type: "staff_offer_accepted"; requestNumber: number; orderNumber: number; offerTitle: string; totalLabel: string }
  | { type: "staff_order_issue"; orderNumber: number; offerTitle: string; comment: string | null };

export type NotificationType = NotificationEvent["type"];

const DEFAULT_APP_URL = "http://localhost:3000";

export function appBaseUrl(value = process.env.APP_URL): string {
  const raw = String(value ?? "").trim();
  if (!raw) return DEFAULT_APP_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return DEFAULT_APP_URL;
    return (url.origin + url.pathname).replace(/\/+$/, "");
  } catch {
    return DEFAULT_APP_URL;
  }
}

// Control characters and lone surrogates make Telegram reject the whole message, so they never get through.
function cleanText(value: string | null | undefined, multiline: boolean): string {
  const chars = Array.from(String(value ?? "").replace(/\r\n?/g, "\n"), (ch) => {
    const code = ch.charCodeAt(0);
    if (ch.length === 1 && code >= 0xd800 && code <= 0xdfff) return "\uFFFD";
    return (code < 0x20 && ch !== "\n") || (code >= 0x7f && code <= 0x9f) ? " " : ch;
  });
  let text = chars.join("");
  if (!multiline) text = text.replace(/\s+/g, " ");
  else text = text.replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
  return maskVins(text).trim();
}

// Escapes user-written text and cuts it to `max` characters of escaped output: entities are never split,
// and the whole message stays under Telegram's 4096-character limit even for text full of "&" or "<".
// VINs are masked: Telegram is a third party and messages get forwarded; the full VIN is one tap away on the site.
function userText(value: string | null | undefined, max: number, multiline = false): string {
  const chars = Array.from(cleanText(value, multiline));
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const piece = escapeHtml(chars[i]);
    const reserve = i < chars.length - 1 ? 1 : 0;
    if (out.length + piece.length + reserve > max) return out.trimEnd() + "…";
    out += piece;
  }
  return out;
}

const validNumber = (n: number) => Number.isSafeInteger(n) && n > 0;
const num = (n: number) => (validNumber(n) ? String(n) : "—");
// A broken number must not produce a broken link: fall back to the list page.
const page = (base: string, section: string, n: number) => (validNumber(n) ? `${base}/${section}/${n}` : `${base}/${section}`);

const link = (label: string, url: string) => `${label}: ${escapeHtml(url)}`;

// Returns Telegram HTML. Links are plain URLs on their own line so the text reads the same in Telegram
// and in console logs (the fallback channel while no bot token is configured).
export function renderEvent(event: NotificationEvent, appUrl = appBaseUrl()): string {
  const base = appBaseUrl(appUrl);
  switch (event.type) {
    case "request_received": {
      const n = num(event.requestNumber);
      return [
        `<b>Мы приняли заявку №${n}</b>`,
        "Подборщик проверит, что подходит к вашей машине, и пришлёт варианты с ценой и сроком.",
        "",
        link("Открыть заявку", page(base, "requests", event.requestNumber)),
      ].join("\n");
    }
    case "request_clarification": {
      const n = num(event.requestNumber);
      return [
        `<b>Вопрос по заявке №${n}</b>`,
        userText(event.question, 1500, true) || "Подборщику нужно уточнение. Откройте заявку.",
        "",
        link("Ответить", page(base, "requests", event.requestNumber)),
      ].join("\n");
    }
    case "request_offered": {
      const n = num(event.requestNumber);
      const count = event.offerCount;
      const headline =
        Number.isSafeInteger(count) && count > 0
          ? `Мы нашли ${count} ${pluralRu(count, "вариант", "варианта", "вариантов")} по заявке №${n}`
          : `Мы подобрали варианты по заявке №${n}`;
      return [
        `<b>${headline}</b>`,
        "Сравните цены и сроки и выберите подходящий.",
        "",
        link("Выбрать", page(base, "requests", event.requestNumber)),
      ].join("\n");
    }
    case "request_message": {
      const n = num(event.requestNumber);
      return [
        `<b>Сообщение по заявке №${n}</b>`,
        userText(event.body, 1500, true) || "Подборщик написал вам. Откройте заявку.",
        "",
        link("Ответить", page(base, "requests", event.requestNumber)),
      ].join("\n");
    }
    case "request_cancelled": {
      const n = num(event.requestNumber);
      const reason = userText(event.reason, 500);
      return [
        `<b>Заявка №${n} отменена</b>`,
        reason ? `Причина: ${reason}` : "Подборщик отменил заявку.",
        "Если деталь всё ещё нужна, создайте новую заявку.",
        "",
        link("Открыть заявку", page(base, "requests", event.requestNumber)),
      ].join("\n");
    }
    case "request_closed": {
      const n = num(event.requestNumber);
      const reason = userText(event.reason, 500);
      return [
        `<b>Заявка №${n} закрыта</b>`,
        reason ? `Причина: ${reason}` : "Подборщик закрыл заявку.",
        "Если деталь всё ещё нужна, создайте новую заявку.",
        "",
        link("Открыть заявку", page(base, "requests", event.requestNumber)),
      ].join("\n");
    }
    case "order_status": {
      const n = num(event.orderNumber);
      const status = userText(event.statusLabel, 150);
      return [
        `<b>Заказ №${n}</b>`,
        status ? `Статус: ${status}` : "Статус заказа изменился.",
        "",
        link("Открыть заказ", page(base, "orders", event.orderNumber)),
      ].join("\n");
    }
    case "staff_new_request": {
      const n = num(event.requestNumber);
      return [
        `<b>Новая заявка №${n}</b> · 新询价`,
        userText(event.vehicleLabel, 150) || "Клиент не указал машину",
        userText(event.title, 300) || "Без названия",
        "",
        link("Взять в работу", page(base, "sourcer/requests", event.requestNumber)),
      ].join("\n");
    }
    case "staff_customer_reply": {
      const n = num(event.requestNumber);
      const body = userText(event.body, 1500, true);
      return [
        `<b>${event.answered ? "Клиент ответил на вопрос" : "Клиент написал"} по заявке №${n}</b> · 客户回复`,
        userText(event.title, 300) || "Без названия",
        ...(body ? [body] : []),
        "",
        link("Открыть заявку", page(base, "sourcer/requests", event.requestNumber)),
      ].join("\n");
    }
    case "staff_request_cancelled": {
      const n = num(event.requestNumber);
      return [
        `<b>Клиент отменил заявку №${n}</b> · 客户取消`,
        userText(event.title, 300) || "Без названия",
        "",
        link("Открыть заявку", page(base, "sourcer/requests", event.requestNumber)),
      ].join("\n");
    }
    case "staff_offer_accepted": {
      const total = userText(event.totalLabel, 50);
      return [
        `<b>Новый заказ №${num(event.orderNumber)}</b> · 新订单`,
        `Клиент выбрал вариант по заявке №${num(event.requestNumber)}: ${userText(event.offerTitle, 300) || "без названия"}`,
        ...(total ? [`Сумма: ${total}`] : []),
        "Пришлите реквизиты для оплаты в чате заявки.",
        "",
        link("Открыть заказ", page(base, "sourcer/orders", event.orderNumber)),
      ].join("\n");
    }
    case "staff_order_issue": {
      const n = num(event.orderNumber);
      const comment = userText(event.comment, 1500, true);
      return [
        `<b>Не подошла деталь, заказ №${n}</b> · 配件不匹配`,
        userText(event.offerTitle, 300) || "Без названия",
        comment ? `Комментарий клиента: ${comment}` : "Клиент не оставил комментарий.",
        "Свяжитесь с клиентом и оформите возврат или замену.",
        "",
        link("Открыть заказ", page(base, "sourcer/orders", event.orderNumber)),
      ].join("\n");
    }
  }
}

// Plain-text version of renderEvent output for console logs.
export function htmlToPlain(html: string): string {
  return String(html ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}
