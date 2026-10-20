import { REQUEST_STATUS } from "@/components/requests/labels";
import { Badge, StatusPill } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/db/schema";
import { REQUEST_STATUS_ZH } from "./labels";
import { Zh } from "./zh";

export function StaffStatusBadge({ status, className, pill = false }: { status: RequestStatus; className?: string; pill?: boolean }) {
  const s = REQUEST_STATUS[status] ?? { label: status, tone: "neutral" as const };
  const Tag = pill ? StatusPill : Badge;
  return (
    <Tag tone={s.tone} className={className}>
      {s.label}
      {REQUEST_STATUS_ZH[status] ? <Zh className={pill ? "ml-1 font-normal text-muted" : "ml-1 font-normal"}>{REQUEST_STATUS_ZH[status]}</Zh> : null}
    </Tag>
  );
}
