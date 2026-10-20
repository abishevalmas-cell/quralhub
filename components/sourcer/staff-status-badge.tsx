import { REQUEST_STATUS } from "@/components/requests/labels";
import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/db/schema";
import { REQUEST_STATUS_ZH } from "./labels";
import { Zh } from "./zh";

export function StaffStatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const s = REQUEST_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
      {REQUEST_STATUS_ZH[status] ? <Zh className="ml-1 font-normal">{REQUEST_STATUS_ZH[status]}</Zh> : null}
    </Badge>
  );
}
