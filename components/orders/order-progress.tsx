import { Timeline, TimelineItem, type TimelineState } from "@/components/ui/timeline";
import type { OrderStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ORDER_STAGES, ORDER_STATUS } from "./labels";

// Where the order is on its way from China: a bar of eight segments and the stages as a timeline.
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "returned")
    return (
      <div className="grid gap-1 rounded-[14px] bg-bad-bg px-4 py-3 text-bad" role="status">
        <p className="font-bold">{status === "cancelled" ? "Заказ отменён" : "Оформлен возврат"}</p>
        <p className="text-sm">Подробности — в истории заказа и в чате заявки.</p>
      </div>
    );
  const current = Math.max(0, ORDER_STAGES.indexOf(status as (typeof ORDER_STAGES)[number]));
  const delivered = status === "delivered";
  const stateOf = (i: number): TimelineState => (i < current || delivered ? "done" : i === current ? "current" : "todo");
  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-lg font-bold tracking-[-0.02em]">{ORDER_STATUS[status].label}</p>
          <p className="text-sm text-muted">
            Этап {current + 1} из {ORDER_STAGES.length}
          </p>
        </div>
        <div className="grid grid-cols-8 gap-1" aria-hidden="true">
          {ORDER_STAGES.map((stage, i) => {
            const state = stateOf(i);
            return (
              <div key={stage} className={cn("h-1.5 rounded-full", state === "done" ? "bg-ink" : state === "current" ? "bg-lime" : "bg-line")} />
            );
          })}
        </div>
      </div>
      <Timeline label="Этапы заказа">
        {ORDER_STAGES.map((stage, i) => (
          <TimelineItem key={stage} state={stateOf(i)} title={ORDER_STATUS[stage].label} />
        ))}
      </Timeline>
    </div>
  );
}
