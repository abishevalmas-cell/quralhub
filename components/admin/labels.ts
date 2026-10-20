import type { Tone } from "@/components/ui/badge";
import type { UserRole } from "@/lib/db/schema";

// Type-only schema imports: this file is also used by client components.

export const ROLE: Record<UserRole, { label: string; tone: Tone; hint: string }> = {
  customer: { label: "Клиент", tone: "neutral", hint: "Владелец машины: гараж, заявки и заказы. Режим выбирает сам в профиле" },
  master: { label: "Мастер, СТО", tone: "neutral", hint: "Заказывает детали для машин клиентов. Режим выбирает сам в профиле" },
  sourcer: { label: "Подборщик", tone: "hand", hint: "Ведёт очередь заявок, видит закупочные цены и поставщиков" },
  admin: { label: "Администратор", tone: "warn", hint: "Всё, что видит подборщик, плюс роли, цены и доступ к 17VIN" },
};

export const ROLE_ORDER: UserRole[] = ["customer", "master", "sourcer", "admin"];

export const CALL_OPERATION: Record<string, string> = {
  decode: "Расшифровка VIN",
  categories: "Группы каталога",
  parts: "Детали группы",
  oe: "Поиск по OE",
};

export const CALL_MODE: Record<string, string> = { live: "17VIN", fixture: "Пример" };

// Provider statuses from lib/providers plus "pending": the journal row is written before the call.
export const CALL_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Без ответа", tone: "neutral" },
  success: { label: "Успешно", tone: "ok" },
  empty: { label: "Пусто", tone: "neutral" },
  unsupported: { label: "Нет каталога", tone: "warn" },
  invalid: { label: "Неверный запрос", tone: "warn" },
  auth: { label: "Ошибка входа", tone: "bad" },
  quota_or_expired: { label: "Пакет исчерпан", tone: "bad" },
  rate_limit: { label: "Лимит", tone: "warn" },
  timeout: { label: "Таймаут", tone: "bad" },
  network: { label: "Нет связи", tone: "bad" },
  malformed: { label: "Плохой ответ", tone: "bad" },
  not_configured: { label: "Не настроено", tone: "bad" },
  provider_error: { label: "Сбой 17VIN", tone: "bad" },
};
