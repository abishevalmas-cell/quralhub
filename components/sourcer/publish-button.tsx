"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { pluralRu } from "@/lib/utils";
import { ActionError } from "./action-error";
import { useStaffAction } from "./use-staff-action";
import { Zh } from "./zh";

export function PublishButton({
  requestId,
  version,
  drafts,
  blockedReason,
}: {
  requestId: string;
  version: number;
  drafts: number;
  blockedReason: string | null;
}) {
  const { busy, error, run, refresh } = useStaffAction();
  const publish = () => run("publish", () => api(`/api/sourcer/requests/${requestId}`, { method: "PATCH", body: { action: "publish", version } }));
  return (
    <div className="grid gap-2 rounded-[18px] border border-line bg-card p-4">
      <Button variant="primary" size="lg" onClick={publish} disabled={busy !== null || Boolean(blockedReason)}>
        {busy ? (
          "Публикуем…"
        ) : (
          <>
            Отправить клиенту {drafts} {pluralRu(drafts, "черновик", "черновика", "черновиков")} <Zh className="font-normal">发布</Zh>
          </>
        )}
      </Button>
      <p className="text-sm text-muted">
        {blockedReason ??
          "Клиент получит уведомление и увидит цену, срок, совместимость и комментарий. Закупка, поставщик и заметки останутся внутри."}
      </p>
      <ActionError error={error} onRefresh={refresh} />
    </div>
  );
}
