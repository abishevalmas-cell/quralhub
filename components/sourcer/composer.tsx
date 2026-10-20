"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import type { RequestStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { ActionError } from "./action-error";
import { useStaffAction } from "./use-staff-action";
import { Zh } from "./zh";

type Mode = "message" | "note" | "clarify";

const MODES: { id: Mode; label: string; zh: string; field: string; hint: string; submit: string; placeholder: string }[] = [
  {
    id: "message",
    label: "Клиенту",
    zh: "客户",
    field: "Сообщение клиенту",
    hint: "Клиент увидит его в заявке. Статус не меняется.",
    submit: "Отправить",
    placeholder: "Например: нашли два варианта, считаем доставку",
  },
  {
    id: "note",
    label: "Заметка",
    zh: "内部",
    field: "Внутренняя заметка",
    hint: "Видят только подборщики и администратор. Клиент её не увидит.",
    submit: "Сохранить заметку",
    placeholder: "Например: поставщик просит предоплату, ответит завтра",
  },
  {
    id: "clarify",
    label: "Вопрос",
    zh: "提问",
    field: "Вопрос клиенту",
    hint: "Заявка перейдёт в «Нужно уточнение», клиент получит уведомление.",
    submit: "Задать вопрос",
    placeholder: "Например: пришлите фото таблички на двери водителя",
  },
];

export function Composer({
  requestId,
  version,
  status,
  canEdit,
  chatOpen,
}: {
  requestId: string;
  version: number;
  status: RequestStatus;
  canEdit: boolean;
  // From the server: a closed request stays writable while a delivered part did not fit.
  chatOpen?: boolean;
}) {
  const open = chatOpen ?? (status !== "closed" && status !== "cancelled");
  const canClarify = status === "new" || status === "searching" || status === "clarification";
  const disabled: Record<Mode, boolean> = { message: !open, note: false, clarify: !canClarify };
  const [picked, setPicked] = useState<Mode>("message");
  const [body, setBody] = useState("");
  const { busy, error, run, refresh } = useStaffAction();
  // A status change can make the picked mode unavailable (no questions once the customer is choosing).
  const mode: Mode = disabled[picked] ? (open ? "message" : "note") : picked;
  const current = MODES.find((m) => m.id === mode)!;

  if (!canEdit)
    return <p className="text-sm text-muted">Писать в заявку может подборщик, который её ведёт, или администратор.</p>;

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    const payload = mode === "clarify" ? { action: "clarify", question: text, version } : { action: mode, body: text };
    const ok = await run("send", () => api(`/api/sourcer/requests/${requestId}`, { method: "PATCH", body: payload }));
    if (ok) setBody("");
  }

  return (
    <form onSubmit={send} className="grid gap-3">
      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-sm font-semibold">Кому пишем</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <div key={m.id}>
              <input
                type="radio"
                id={`compose-${m.id}`}
                name="compose-mode"
                value={m.id}
                checked={mode === m.id}
                disabled={disabled[m.id]}
                onChange={() => setPicked(m.id)}
                className="peer sr-only"
              />
              <label
                htmlFor={`compose-${m.id}`}
                className={cn(
                  "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-[30px] border border-line bg-card px-3.5 text-sm font-semibold transition hover:border-line-strong",
                  "peer-checked:border-strong peer-checked:bg-strong peer-checked:text-on-strong dark:peer-checked:border-line-strong",
                  "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime-ink",
                )}
              >
                {m.label} <Zh className="font-normal">{m.zh}</Zh>
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      <Field label={current.field} htmlFor="compose-body" hint={current.hint}>
        <Textarea
          id="compose-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={3000}
          rows={3}
          placeholder={current.placeholder}
          className={cn(mode === "note" && "border-dashed border-hand/60 bg-hand-bg")}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy !== null || !body.trim()} variant={mode === "note" ? "soft" : "dark"}>
          {busy ? "Отправляем…" : current.submit}
        </Button>
        {!open ? <span className="text-sm text-muted">Заявка закрыта: клиенту уже не написать.</span> : null}
      </div>
      <ActionError error={error} onRefresh={refresh} />
    </form>
  );
}
