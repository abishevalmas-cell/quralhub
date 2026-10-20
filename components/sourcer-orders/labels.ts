import type { Tone } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/db/schema";

// Type-only schema imports: this file is also used by client components.

export const ORDER_STATUS_ZH: Record<OrderStatus, string> = {
  awaiting_payment: "待付款",
  paid: "已付款",
  purchased: "已采购",
  consolidation: "集运仓",
  in_transit: "运输中",
  customs: "清关中",
  in_city: "已到达",
  delivered: "已交付",
  cancelled: "已取消",
  returned: "已退货",
};

// What the sourcer presses to move the order into a status. awaiting_payment is never a target.
export const NEXT_ACTION: Record<OrderStatus, { label: string; zh: string; hint: string; danger?: boolean }> = {
  awaiting_payment: { label: "Ожидает оплаты", zh: "待付款", hint: "" },
  paid: { label: "Оплата получена", zh: "已收款", hint: "Деньги пришли. Можно выкупать деталь." },
  purchased: { label: "Выкуплен у поставщика", zh: "已采购", hint: "Поставщик подтвердил заказ и отгрузку." },
  consolidation: { label: "На складе консолидации", zh: "已入集运仓", hint: "Посылка пришла на склад в Китае." },
  in_transit: { label: "Отправлен", zh: "已发货", hint: "Груз выехал со склада. Укажите трек-номер, если он есть." },
  customs: { label: "На таможне", zh: "清关中", hint: "Груз проходит таможенное оформление." },
  in_city: { label: "Прибыл в город", zh: "已到达", hint: "Деталь в городе клиента. Укажите, где и когда забрать." },
  delivered: { label: "Выдан клиенту", zh: "已交付", hint: "Клиент забрал деталь. Заявка закроется." },
  cancelled: {
    label: "Отменить заказ",
    zh: "取消订单",
    hint: "Предложение снимется, заявка вернётся в поиск, и вы сможете предложить другой вариант.",
    danger: true,
  },
  returned: { label: "Оформить возврат", zh: "退货", hint: "Клиент вернул деталь.", danger: true },
};

export const FIT_FEEDBACK: Record<"fits" | "not_fits", { label: string; zh: string; tone: Tone }> = {
  fits: { label: "Подошла", zh: "适配", tone: "ok" },
  not_fits: { label: "Не подошла", zh: "不适配", tone: "bad" },
};

export const FITMENT_RESULT: Record<"fits" | "not_fits" | "unknown", { label: string; tone: Tone }> = {
  fits: { label: "Подошла", tone: "ok" },
  not_fits: { label: "Не подошла", tone: "bad" },
  unknown: { label: "Не проверено", tone: "neutral" },
};

export const FITMENT_SOURCE: Record<"catalog" | "sourcer" | "install_feedback", string> = {
  catalog: "Каталог",
  sourcer: "Подборщик",
  install_feedback: "Отзыв после установки",
};
