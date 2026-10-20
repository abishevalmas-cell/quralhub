import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/db/schema";
import { REQUEST_STATUS } from "./labels";

export function RequestStatusBadge({ status, className }: { status: RequestStatus; className?: string }) {
  const s = REQUEST_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone} className={className}>
      {s.label}
    </Badge>
  );
}
