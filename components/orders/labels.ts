import type { Tone } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/db/schema";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  awaiting_payment: { label: "Ожидает оплаты", tone: "warn" },
  paid: { label: "Оплачен", tone: "hand" },
  purchased: { label: "Выкуплен в Китае", tone: "hand" },
  consolidation: { label: "На складе консолидации", tone: "hand" },
  in_transit: { label: "В пути", tone: "hand" },
  customs: { label: "Таможня", tone: "hand" },
  in_city: { label: "В городе", tone: "ok" },
  delivered: { label: "Выдан", tone: "ok" },
  cancelled: { label: "Отменён", tone: "bad" },
  returned: { label: "Возврат", tone: "bad" },
};

// The delivery line; cancelled and returned orders are shown outside it.
export const ORDER_STAGES = [
  "awaiting_payment",
  "paid",
  "purchased",
  "consolidation",
  "in_transit",
  "customs",
  "in_city",
  "delivered",
] as const satisfies readonly OrderStatus[];
