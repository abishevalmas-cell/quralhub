"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type Choice = "fits" | "not_fits";

const COMMENT_MAX = 1000;

const OPTIONS: { value: Choice; id: string; label: string }[] = [
  { value: "fits", id: "fit-yes", label: "Да, подошла" },
  { value: "not_fits", id: "fit-no", label: "Нет, не подошла" },
];

export function FitFeedbackForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!choice) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/orders/${orderId}/fit`, { body: { result: choice, comment: comment.trim() || null } });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="text-xl font-extrabold tracking-tight">Деталь подошла?</legend>
        <p className="-mt-1 text-sm text-muted">Ответ поможет точнее подбирать детали для таких же машин.</p>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => (
            <div key={o.value}>
              <input
                type="radio"
                id={o.id}
                name="fit"
                value={o.value}
                checked={choice === o.value}
                onChange={() => setChoice(o.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={o.id}
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-center text-[15px] font-semibold transition peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime-ink",
                  choice === o.value
                    ? o.value === "fits"
                      ? "border-ok bg-ok-bg text-ok"
                      : "border-bad bg-bad-bg text-bad"
                    : "border-line bg-card hover:bg-soft",
                )}
              >
                {choice === o.value ? <Icon name={o.value === "fits" ? "check" : "close"} className="size-4" /> : null}
                {o.label}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      {choice ? (
        <Field
          label={choice === "fits" ? "Комментарий" : "Что не так?"}
          htmlFor="fit-comment"
          hint={
            choice === "fits"
              ? "Необязательно. Например: встала без доработок"
              : "Например: другой разъём или крепление. Подборщик свяжется с вами по возврату или замене"
          }
          error={error}
        >
          <Textarea
            id="fit-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={COMMENT_MAX}
            rows={3}
          />
        </Field>
      ) : error ? (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}

      <Button variant="primary" disabled={busy || !choice} className="w-full sm:w-auto sm:justify-self-start">
        {busy ? "Отправляем…" : "Отправить ответ"}
      </Button>
    </form>
  );
}
