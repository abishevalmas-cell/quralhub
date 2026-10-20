"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeVehicleModel } from "@/app/garage/_lib/actions";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { BRANDS, findBrand, modelsByBrand, modelYears, type BrandId } from "@/lib/catalog";

// Which catalog model the car's picture and parts list use. Offered when the decoded or typed name matched none
// (or the wrong one); the brand from the VIN or the form comes first. It never changes a fitment.
export function ModelSelect({ vehicleId, current, brand }: { vehicleId: string; current: string | null; brand: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const first = findBrand(brand);
  // A sub-brand's group comes along: a VIN that says "Changan" may be a Deepal.
  const related = new Set<BrandId>(first ? [first.id, ...BRANDS.filter((b) => b.parent === first.id || b.id === first.parent).map((b) => b.id)] : []);
  const ordered = [...BRANDS.filter((b) => related.has(b.id)), ...BRANDS.filter((b) => !related.has(b.id))];

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await changeVehicleModel(vehicleId, value || null).catch(() => null);
    setBusy(false);
    if (result?.ok) {
      setMessage({ text: "Сохранено" });
      router.refresh();
    } else setMessage({ text: result?.error ?? "Не получилось сохранить. Попробуйте ещё раз", bad: true });
  }

  return (
    <form onSubmit={save} className="grid gap-3" id="vehicle-model">
      <Field
        label="Модель для схемы и списка деталей"
        htmlFor="vehicle-model-select"
        hint="Влияет только на картинку и список деталей. Совместимость всё равно проверит подборщик."
      >
        <Select id="vehicle-model-select" value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">Нет в списке — схема условная</option>
          {ordered.map((b) => {
            const list = modelsByBrand(b.id);
            return list.length ? (
              <optgroup key={b.id} label={b.name}>
                {list.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand} {m.model} ({modelYears(m)})
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </Select>
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="soft" disabled={busy || value === (current ?? "")}>
          {busy ? "Сохраняем…" : "Сохранить модель"}
        </Button>
        {message ? (
          <p role="status" className={message.bad ? "text-sm text-bad" : "text-sm text-muted"}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
