import type { Tone } from "@/components/ui/badge";
import type { FitmentLevel, OfferKind, RequestStatus } from "@/lib/db/schema";

// Type-only schema imports: this file is also used by client components.

export const REQUEST_STATUS: Record<RequestStatus, { label: string; tone: Tone; hint: string }> = {
  new: { label: "Новая", tone: "neutral", hint: "Подборщик ещё не взял заявку. Отвечаем в рабочее время." },
  clarification: { label: "Нужно уточнение", tone: "warn", hint: "Подборщику нужно уточнение. Ответьте в чате ниже." },
  searching: { label: "Ищем", tone: "hand", hint: "Подборщик ищет варианты и проверяет совместимость." },
  offered: { label: "Есть предложения", tone: "ok", hint: "Выберите подходящий вариант. После этого создадим заказ." },
  accepted: { label: "Вариант выбран", tone: "ok", hint: "Вы выбрали вариант, заказ создан." },
  closed: { label: "Закрыта", tone: "neutral", hint: "Заявка закрыта." },
  cancelled: { label: "Отменена", tone: "bad", hint: "Заявка отменена." },
};

export const OFFER_KIND: Record<OfferKind, string> = {
  original: "Оригинал",
  oem: "OEM",
  aftermarket: "Аналог",
  used: "Б/у",
};

export const FITMENT: Record<FitmentLevel, { label: string; tone: Tone; hint: string }> = {
  vin_confirmed: { label: "Подходит по VIN", tone: "ok", hint: "Номер есть в каталоге для VIN вашей машины" },
  needs_check: {
    label: "Нужна проверка",
    tone: "warn",
    hint: "Каталог не подтвердил, что деталь подходит к вашему VIN. Если сомневаетесь, спросите подборщика в чате до заказа",
  },
  manual: { label: "Ручной подбор", tone: "hand", hint: "Подборщик подобрал деталь по описанию и фото" },
};

export const AXIS_LABEL = { front: "Передняя", rear: "Задняя" } as const;
export const SIDE_LABEL = { left: "Левая", right: "Правая" } as const;
