import { ORDER_STATUS } from "@/components/orders/labels";
import { Badge, StatusPill } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/db/schema";
import { ORDER_STATUS_ZH } from "./labels";

export function StaffOrderStatusBadge({ status, className, pill = false }: { status: OrderStatus; className?: string; pill?: boolean }) {
  const s = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as const };
  const Tag = pill ? StatusPill : Badge;
  return (
    <Tag tone={s.tone} className={className}>
      {s.label}
      {ORDER_STATUS_ZH[status] ? (
        <span className="zh ml-1 font-normal opacity-80" lang="zh">
          {ORDER_STATUS_ZH[status]}
        </span>
      ) : null}
    </Tag>
  );
}
