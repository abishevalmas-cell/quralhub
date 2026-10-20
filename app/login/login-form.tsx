"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/client/api";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("+7 ");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ phone: string; devCode?: string }>("/api/auth/otp", { body: { phone } });
      setSentTo(result.phone);
      setDevCode(result.devCode);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/verify", { body: { phone: sentTo, code } });
      router.replace(next);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 shadow-[0_10px_40px_rgb(23_35_44/0.08)] sm:p-6">
      {!sentTo ? (
        <form onSubmit={send} className="grid gap-4">
          <Field label="Номер телефона" htmlFor="phone" hint="Казахстан и Россия +7, Узбекистан +998, Кыргызстан +996" error={error}>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Field>
          <Button variant="primary" size="lg" disabled={busy}>
            {busy ? "Отправляем…" : "Получить код"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="grid gap-4">
          <Field label={`Код из сообщения на +${sentTo}`} htmlFor="code" error={error}>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-lg tracking-[0.4em]"
              autoFocus
              required
            />
          </Field>
          {devCode ? (
            <p className="rounded-[12px] bg-warn-bg px-3 py-2 text-sm text-warn">
              Режим разработки: SMS не подключены, код <span className="font-mono font-semibold">{devCode}</span>
            </p>
          ) : null}
          <Button variant="primary" size="lg" disabled={busy || code.length !== 6}>
            {busy ? "Проверяем…" : "Войти"}
          </Button>
          <button type="button" className="min-h-9 text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink" onClick={() => { setSentTo(null); setCode(""); setError(null); }}>
            Изменить номер
          </button>
        </form>
      )}
    </Card>
  );
}
