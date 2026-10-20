"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import type { OfferStatus } from "@/lib/db/schema";
import { ActionError } from "./action-error";
import { useStaffAction } from "./use-staff-action";
import { Zh } from "./zh";

// Buttons only: the offer itself is rendered on the server, so its supplier data never becomes a client prop.
export function OfferActions({
  offerId,
  title,
  status,
  editHref,
}: {
  offerId: string;
  title: string;
  status: OfferStatus;
  editHref: string;
}) {
  const { busy, error, run, refresh } = useStaffAction();
  const withdraw = () => {
    if (!window.confirm(`Отозвать «${title}»? Клиент больше не сможет его выбрать.`)) return;
    run("withdraw", () => api(`/api/sourcer/offers/${offerId}`, { method: "PATCH", body: { action: "withdraw" } }));
  };
  const remove = () => {
    if (!window.confirm(`Удалить черновик «${title}»?`)) return;
    run("delete", () => api(`/api/sourcer/offers/${offerId}`, { method: "DELETE" }));
  };
  if (status !== "draft" && status !== "published") return null;
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <>
            <ButtonLink href={editHref} variant="soft" size="sm" scroll={false}>
              Изменить <Zh className="font-normal">编辑</Zh>
            </ButtonLink>
            <Button variant="ghost" size="sm" onClick={remove} disabled={busy !== null}>
              {busy === "delete" ? "Удаляем…" : "Удалить"}
            </Button>
          </>
        ) : (
          <Button variant="danger" size="sm" onClick={withdraw} disabled={busy !== null}>
            {busy === "withdraw" ? "Отзываем…" : <>Отозвать <Zh className="font-normal">撤回</Zh></>}
          </Button>
        )}
      </div>
      <ActionError error={error} onRefresh={refresh} />
    </div>
  );
}
