"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { ApiError, api } from "@/lib/client/api";
import type { OrderStatus } from "@/lib/db/schema";
import { NEXT_ACTION } from "./labels";

const NOTE_MAX = 500;

// Two steps on purpose: every move notifies the customer, so the second button names the new status.
// Props are plain ids and statuses; nothing internal about the offer reaches the browser.
export function AdvanceOrderForm({ orderId, version, next }: { orderId: string; version: number; next: OrderStatus[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forward = next.filter((s) => !NEXT_ACTION[s].danger);
  const danger = next.filter((s) => NEXT_ACTION[s].danger);
  const needsNote = target === "cancelled" || target === "returned";

  function choose(status: OrderStatus | null) {
    setTarget(status);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/sourcer/orders/${orderId}`, { method: "PATCH", body: { status: target, note: note.trim() || null, version } });
      setTarget(null);
      setNote("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      // Someone else moved the order: show the fresh state behind the message.
      if (e instanceof ApiError && e.status === 409) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!target)
    return (
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          {forward.map((status, i) => (
            <Button
              key={status}
              type="button"
              variant={i === 0 ? "primary" : "soft"}
              onClick={() => choose(status)}
              className="w-full sm:w-auto"
            >
              {NEXT_ACTION[status].label}
              <span className="zh text-sm font-medium" lang="zh">
                {NEXT_ACTION[status].zh}
              </span>
            </Button>
          ))}
        </div>
        {danger.length ? (
          <div className="flex flex-wrap gap-2 border-t border-dashed border-line pt-3">
            {danger.map((status) => (
              <Button key={status} type="button" variant="danger" size="sm" onClick={() => choose(status)}>
                {NEXT_ACTION[status].label}
                <span className="zh font-medium" lang="zh">
                  {NEXT_ACTION[status].zh}
                </span>
              </Button>
            ))}
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );

  const action = NEXT_ACTION[target];
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className={action.danger ? "grid gap-1 rounded-xl bg-bad-bg p-3 text-bad" : "grid gap-1 rounded-xl bg-soft p-3"}>
        <p className="font-bold">
          {action.label}{" "}
          <span className="zh font-semibold" lang="zh">
            {action.zh}
          </span>
        </p>
        <p className="text-sm">{action.hint}</p>
      </div>
      <Field
        label={needsNote ? (target === "cancelled" ? "Причина отмены" : "Причина возврата") : "Комментарий для клиента"}
        htmlFor="order-note"
        hint={`Клиент увидит его в истории заказа${needsNote ? "" : ". Необязательно"}. До ${NOTE_MAX} символов.`}
        error={error}
      >
        <Textarea
          id="order-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          rows={3}
          required={needsNote}
          placeholder={
            needsNote
              ? "Например: поставщик снял деталь с продажи, вернём деньги в течение 3 дней"
              : target === "in_transit"
                ? "Например: трек-номер CN123456789"
                : target === "in_city"
                  ? "Например: можно забрать с 10:00 до 19:00 по адресу…"
                  : ""
          }
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={action.danger ? "danger" : "primary"}
          disabled={busy || (needsNote && !note.trim())}
          className="w-full sm:w-auto"
        >
          {busy ? "Сохраняем…" : target === "cancelled" ? "Да, отменить заказ" : target === "returned" ? "Да, оформить возврат" : "Сохранить и уведомить клиента"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => choose(null)} disabled={busy} className="w-full sm:w-auto">
          Назад
        </Button>
      </div>
    </form>
  );
}
