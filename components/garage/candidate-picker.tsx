"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VehicleCandidate } from "@/lib/db/schema";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { driveText, fuelText } from "./catalog-names";

// The owner confirms their trim; nothing is chosen for them.
export function CandidatePicker({
  vehicleId,
  candidates,
  selectedId,
}: {
  vehicleId: string;
  candidates: VehicleCandidate[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(candidateId: string | null) {
    setBusy(candidateId ?? "clear");
    setError(null);
    try {
      await api(`/api/vehicles/${vehicleId}`, { method: "PATCH", body: { selectedCandidateId: candidateId } });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2 md:grid-cols-2">
        {candidates.map((c) => {
          const selected = c.id === selectedId;
          const title = c.version || c.description || "Комплектация без названия";
          const details = [c.year && `${c.year} г.`, c.engine && `двигатель ${c.engine}`, fuelText(c.fuel).ru, driveText(c.drive).ru]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={c.id} className={cn("grid gap-1 rounded-xl border p-3", selected ? "border-ok" : "border-line")}>
              <p className="font-semibold">{title}</p>
              {c.description && c.description !== title ? <p className="text-sm text-muted">{c.description}</p> : null}
              {details ? <p className="text-sm text-muted">{details}</p> : null}
              <div className="mt-1">
                {selected ? (
                  <Badge tone="ok">Ваша комплектация</Badge>
                ) : (
                  <Button size="sm" variant="soft" onClick={() => choose(c.id)} disabled={busy !== null}>
                    {busy === c.id ? "Сохраняем…" : "Это моя комплектация"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {selectedId ? (
        <button
          type="button"
          onClick={() => choose(null)}
          disabled={busy !== null}
          className="justify-self-start text-sm font-semibold text-muted underline disabled:opacity-50"
        >
          {busy === "clear" ? "Сбрасываем…" : "Сбросить выбор"}
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
