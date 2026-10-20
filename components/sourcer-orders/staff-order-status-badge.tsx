import { ORDER_STATUS } from "@/components/orders/labels";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/db/schema";
import { ORDER_STATUS_ZH } from "./labels";

export function StaffOrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
      {ORDER_STATUS_ZH[status] ? (
        <span className="zh ml-1 font-normal" lang="zh">
          {ORDER_STATUS_ZH[status]}
        </span>
      ) : null}
    </Badge>
  );
}
