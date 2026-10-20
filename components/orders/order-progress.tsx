import { Icon } from "@/components/ui/icon";
import type { OrderStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ORDER_STAGES, ORDER_STATUS } from "./labels";

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "returned")
    return (
      <div className="grid gap-1 rounded-xl bg-bad-bg px-4 py-3 text-bad" role="status">
        <p className="font-bold">{status === "cancelled" ? "Заказ отменён" : "Оформлен возврат"}</p>
        <p className="text-sm">Подробности — в истории заказа и в чате заявки.</p>
      </div>
    );
  const current = Math.max(0, ORDER_STAGES.indexOf(status as (typeof ORDER_STAGES)[number]));
  const delivered = status === "delivered";
  return (
    <div className="grid gap-4">
      <div>
        <p className="text-sm text-muted">
          Этап {current + 1} из {ORDER_STAGES.length}
        </p>
        <p className="text-lg font-bold">{ORDER_STATUS[status].label}</p>
      </div>
      <div className="grid grid-cols-8 gap-1" aria-hidden="true">
        {ORDER_STAGES.map((stage, i) => (
          <div key={stage} className={cn("h-2 rounded-full", i < current || delivered ? "bg-ok" : i === current ? "bg-ok/50" : "bg-line")} />
        ))}
      </div>
      <ol className="grid gap-0" aria-label="Этапы заказа">
        {ORDER_STAGES.map((stage, i) => {
          const done = i < current || delivered;
          const now = i === current && !delivered;
          return (
            <li
              key={stage}
              aria-current={now ? "step" : undefined}
              className={cn("flex items-center gap-3 py-1.5 text-[15px]", !done && !now && "text-muted")}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-content-center rounded-full border",
                  done ? "border-ok bg-ok text-paper" : now ? "border-ok bg-ok-bg text-ok" : "border-line bg-card",
                )}
              >
                {done ? <Icon name="check" className="size-4" /> : now ? <span className="size-2 rounded-full bg-ok" /> : null}
              </span>
              <span className={cn(now && "font-bold")}>{ORDER_STATUS[stage].label}</span>
              {done ? <span className="sr-only">— пройден</span> : now ? <span className="sr-only">— сейчас</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
