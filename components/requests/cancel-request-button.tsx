"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";

export function CancelRequestButton({ requestId, version }: { requestId: string; version: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/requests/${requestId}`, { method: "PATCH", body: { action: "cancel", version } });
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      {!confirming ? (
        <Button type="button" variant="ghost" onClick={() => setConfirming(true)} className="justify-self-start text-muted">
          Отменить заявку
        </Button>
      ) : (
        <div className="grid gap-2 rounded-xl bg-bad-bg p-3">
          <p className="text-sm font-semibold text-bad">Отменить заявку? Подборщик перестанет искать, предложения закроются.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" size="sm" onClick={cancel} disabled={busy}>
              {busy ? "Отменяем…" : "Да, отменить"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
              Нет, оставить
            </Button>
          </div>
        </div>
      )}
      {error ? (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
