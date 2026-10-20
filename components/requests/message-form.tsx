"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { api } from "@/lib/client/api";

export function MessageForm({ requestId, awaitingAnswer }: { requestId: string; awaitingAnswer: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/requests/${requestId}/messages`, { body: { body } });
      setBody("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="grid gap-3">
      <Field label={awaitingAnswer ? "Ответ подборщику" : "Сообщение подборщику"} htmlFor="reply" error={error}>
        <Textarea
          id="reply"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={3000}
          rows={3}
          placeholder={awaitingAnswer ? "Ответьте на вопрос подборщика" : "Например: нужна именно с линзой"}
        />
      </Field>
      <Button disabled={busy || !body.trim()} className="justify-self-start">
        {busy ? "Отправляем…" : "Отправить"}
      </Button>
    </form>
  );
}
