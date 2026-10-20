import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/db/schema";
import { ORDER_STATUS } from "./labels";

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}
