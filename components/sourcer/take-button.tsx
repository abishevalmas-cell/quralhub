"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { ActionError } from "./action-error";
import { useStaffAction } from "./use-staff-action";
import { Zh } from "./zh";

// In the queue taking opens the request; on the request page it refreshes in place.
export function TakeButton({
  requestId,
  version,
  open = false,
  primary = false,
}: {
  requestId: string;
  version: number;
  open?: boolean;
  primary?: boolean;
}) {
  const router = useRouter();
  const { busy, error, run, refresh } = useStaffAction();
  const take = () =>
    run(
      "take",
      () => api(`/api/sourcer/requests/${requestId}`, { method: "PATCH", body: { action: "take", version } }),
      open ? () => router.push(`/sourcer/requests/${requestId}`) : undefined,
    );
  return (
    <div className="grid justify-items-start gap-1.5">
      <Button variant={primary ? "primary" : "dark"} size={primary ? "md" : "sm"} onClick={take} disabled={busy !== null}>
        {busy ? (
          "Берём…"
        ) : (
          <>
            Взять в работу <Zh className="font-normal">接单</Zh>
          </>
        )}
      </Button>
      <ActionError error={error} onRefresh={refresh} />
    </div>
  );
}
