"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import { ModelSelect } from "./model-select";

export function VehicleSettings({
  vehicleId,
  label,
  modelId,
  brand,
}: {
  vehicleId: string;
  label: string | null;
  modelId: string | null;
  brand: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(label ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/vehicles/${vehicleId}`, { method: "PATCH", body: { label: value.trim() || null } });
      setMessage("Сохранено");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!window.confirm("Убрать машину из гаража? Заявки и заказы по ней сохранятся.")) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/vehicles/${vehicleId}`, { method: "DELETE" });
      router.push("/garage");
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="grid gap-5">
      <h2 className="text-lg font-bold">Настройки</h2>
      <form onSubmit={save} className="grid gap-3">
        <Field label="Название в гараже" htmlFor="vehicle-label" hint="Видно только вам">
          <Input id="vehicle-label" value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} autoComplete="off" />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="soft" disabled={busy}>
            Сохранить название
          </Button>
          {message ? (
            <p className="text-sm text-muted" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </form>
      <ModelSelect vehicleId={vehicleId} current={modelId} brand={brand} />
      <div className="border-t border-line pt-4">
        <Button type="button" variant="danger" onClick={archive} disabled={busy}>
          Убрать из гаража
        </Button>
      </div>
    </Card>
  );
}
