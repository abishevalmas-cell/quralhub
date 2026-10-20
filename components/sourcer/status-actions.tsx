"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import type { RequestStatus } from "@/lib/db/schema";
import { ActionError } from "./action-error";
import { useStaffAction } from "./use-staff-action";
import { Zh } from "./zh";

type Finish = "cancelled" | "closed";

// Every move sends the version the page was rendered with; a 409 says someone changed the request meanwhile.
export function StatusActions({
  requestId,
  version,
  status,
  assignee,
  canEdit,
  orderActive = false,
}: {
  requestId: string;
  version: number;
  status: RequestStatus;
  assignee: { name: string; isMe: boolean } | null;
  canEdit: boolean;
  // An order still on its way keeps the request open: it closes itself on delivery.
  orderActive?: boolean;
}) {
  const { busy, error, run, refresh } = useStaffAction();
  const [finish, setFinish] = useState<Finish | null>(null);
  const [reason, setReason] = useState("");
  const open = status !== "closed" && status !== "cancelled";
  const patch = (body: Record<string, unknown>) =>
    api(`/api/sourcer/requests/${requestId}`, { method: "PATCH", body: { ...body, version } });
  const move = (target: RequestStatus, extra: Record<string, unknown> = {}) =>
    run(target, () => patch({ action: "status", status: target, ...extra }));

  async function confirmFinish(event: React.FormEvent) {
    event.preventDefault();
    if (!finish) return;
    const ok = await move(finish, { reason: reason.trim() || null });
    if (ok) {
      setFinish(null);
      setReason("");
    }
  }

  const disabled = busy !== null;
  const buttons: React.ReactNode[] = [];
  if (open && !assignee)
    buttons.push(
      <Button key="take" variant="primary" disabled={disabled} onClick={() => run("take", () => patch({ action: "take" }))}>
        {busy === "take" ? "Берём…" : <>Взять в работу <Zh className="font-normal">接单</Zh></>}
      </Button>,
    );
  if (canEdit && open && assignee)
    buttons.push(
      <Button key="release" variant="soft" disabled={disabled} onClick={() => run("release", () => patch({ action: "release" }))}>
        {assignee.isMe ? "Снять с себя" : "Снять с подборщика"} <Zh className="font-normal">释放</Zh>
      </Button>,
    );
  if (canEdit && status === "clarification")
    buttons.push(
      <Button key="resume" variant="soft" disabled={disabled} onClick={() => move("searching")}>
        Продолжить поиск <Zh className="font-normal">继续寻找</Zh>
      </Button>,
    );
  if (canEdit && status === "offered")
    buttons.push(
      <Button key="research" variant="soft" disabled={disabled} onClick={() => move("searching")}>
        Вернуть в поиск <Zh className="font-normal">重新寻找</Zh>
      </Button>,
    );
  if (canEdit && (status === "offered" || (status === "accepted" && !orderActive)))
    buttons.push(
      <Button key="close" variant="soft" disabled={disabled} onClick={() => setFinish("closed")}>
        Закрыть заявку <Zh className="font-normal">关闭</Zh>
      </Button>,
    );
  if (canEdit && (status === "new" || status === "searching" || status === "clarification"))
    buttons.push(
      <Button key="cancel" variant="danger" disabled={disabled} onClick={() => setFinish("cancelled")}>
        Отменить заявку <Zh className="font-normal">取消</Zh>
      </Button>,
    );

  return (
    <div className="grid gap-3">
      {buttons.length ? <div className="flex flex-wrap gap-2">{buttons}</div> : null}
      {!open ? <p className="text-sm text-muted">Заявка {status === "closed" ? "закрыта" : "отменена"}. Можно оставить внутреннюю заметку.</p> : null}
      {!canEdit && assignee ? (
        <p className="text-sm text-muted">Заявку ведёт {assignee.name}. Менять её может только он или администратор.</p>
      ) : null}
      {finish ? (
        <form onSubmit={confirmFinish} className="grid gap-3 rounded-xl border border-line bg-soft p-3">
          <Field
            label={finish === "cancelled" ? "Причина отмены — клиент её увидит" : "Комментарий для клиента, если нужен"}
            htmlFor="finish-reason"
          >
            <Input
              id="finish-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder={finish === "cancelled" ? "Например: этой детали нет у поставщиков" : "Например: клиент купил деталь на месте"}
              autoFocus
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant={finish === "cancelled" ? "danger" : "dark"} disabled={disabled}>
              {busy ? "Сохраняем…" : finish === "cancelled" ? "Да, отменить заявку" : "Да, закрыть заявку"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setFinish(null)}>
              Не {finish === "cancelled" ? "отменять" : "закрывать"}
            </Button>
          </div>
        </form>
      ) : null}
      <ActionError error={error} onRefresh={refresh} />
    </div>
  );
}
