import { Badge } from "@/components/ui/badge";
import type { FitmentLevel } from "@/lib/db/schema";
import { FITMENT_LABEL } from "./labels";

export function FitmentBadge({ fitment }: { fitment: Exclude<FitmentLevel, "manual"> }) {
  const { label, tone } = FITMENT_LABEL[fitment];
  return <Badge tone={tone}>{label}</Badge>;
}
