import { Badge, StatusPill } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/db/schema";
import { ORDER_STATUS } from "./labels";

// `pill` is the larger status in a page header; the tag form goes into lists and cards.
export function OrderStatusBadge({ status, className, pill = false }: { status: OrderStatus; className?: string; pill?: boolean }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as const };
  const Tag = pill ? StatusPill : Badge;
  return (
    <Tag tone={s.tone} className={className}>
      {s.label}
    </Tag>
  );
}
