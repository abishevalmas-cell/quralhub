import { Badge, StatusPill } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/db/schema";
import { REQUEST_STATUS } from "./labels";

// `pill` is the larger status in a page header; the tag form goes into lists and cards.
export function RequestStatusBadge({ status, className, pill = false }: { status: RequestStatus; className?: string; pill?: boolean }) {
  const s = REQUEST_STATUS[status] ?? { label: status, tone: "neutral" as const };
  const Tag = pill ? StatusPill : Badge;
  return (
    <Tag tone={s.tone} className={className}>
      {s.label}
    </Tag>
  );
}
