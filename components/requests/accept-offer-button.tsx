"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { formatKzt } from "@/lib/utils";

// Two steps on purpose: the second button names the amount, so nobody orders by a stray tap.
export function AcceptOfferButton({ offerId, priceKzt }: { offerId: string; priceKzt: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const { order } = await api<{ order: { id: string; number: number } }>(`/api/offers/${offerId}/accept`, { method: "POST" });
      router.push(`/orders/${order.id}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      router.refresh();
    }
  }

  if (!confirming)
    return (
      <Button type="button" onClick={() => setConfirming(true)} className="w-full sm:w-auto">
        Выбрать этот вариант
      </Button>
    );
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={accept} disabled={busy} className="w-full sm:w-auto">
          {busy ? "Оформляем…" : `Подтвердить заказ на ${formatKzt(priceKzt)}`}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={busy} className="w-full sm:w-auto">
          Отмена
        </Button>
      </div>
      <p className="text-sm text-muted">Остальные варианты по заявке закроются. Оплата — после подтверждения, реквизиты пришлёт подборщик.</p>
      {error ? (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
