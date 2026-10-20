"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { changeVehicleColor } from "@/app/garage/_lib/actions";
import { ColorSwatches } from "@/components/models/color-swatches";
import { StageExplorer } from "@/components/models/stage-explorer";
import { colorIdOf, paintHex, type StageSubject } from "@/components/models/subject";
import { getModel, type CarColorId } from "@/lib/catalog";

// Arrow keys step through the radio group, one change per color: only the color the owner stops on is saved.
const SAVE_DELAY_MS = 400;

// The car page's stage in the car's own paint, with the color picker under it. A new color shows at once and is
// saved after a short pause. Saves run one after another, so the last answer is the last write; a failed save puts
// back the color that is really stored.
export function VehicleShowcase({ subject, colorChosen }: { subject: StageSubject; colorChosen: boolean }) {
  const router = useRouter();
  const vehicleId = subject.vehicleId ?? "";
  // Until the owner picks a paint no swatch is ticked; the picture shows the model's usual color meanwhile.
  const [color, setColor] = useState<CarColorId | null>(colorChosen ? subject.colorId : null);
  const [status, setStatus] = useState<{ text: string; bad?: boolean } | null>(null);
  const [chosen, setChosen] = useState(colorChosen);
  const model = getModel(subject.modelId);
  const saved = useRef<CarColorId | null>(colorChosen ? subject.colorId : null);
  const latest = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function persist(next: CarColorId, id: number) {
    queue.current = queue.current.then(async () => {
      // A newer choice came before this one started: only the newest is sent.
      if (id !== latest.current) return;
      setStatus({ text: "Сохраняем…" });
      const result = await changeVehicleColor(vehicleId, next).catch(() => null);
      if (result?.ok) saved.current = next;
      if (id !== latest.current) return;
      if (result?.ok) {
        setChosen(true);
        setStatus({ text: "Цвет сохранён" });
        router.refresh();
      } else {
        setColor(saved.current);
        setStatus({ text: result?.error ?? "Не получилось сохранить цвет. Попробуйте ещё раз", bad: true });
      }
    });
  }

  function change(next: CarColorId) {
    setColor(next);
    const id = ++latest.current;
    if (timer.current) clearTimeout(timer.current);
    if (next === saved.current) {
      setStatus(null);
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      persist(next, id);
    }, SAVE_DELAY_MS);
  }

  return (
    <StageExplorer
      subject={subject}
      signedIn
      title="Узлы и детали"
      colorHex={paintHex(colorIdOf(color ?? subject.colorId), model)}
      below={
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[14px] border border-line bg-card px-4 py-3">
          <ColorSwatches
            name="vehicle-color"
            legend={chosen ? "Цвет на схеме" : "Какого цвета ваша машина?"}
            value={color}
            onChange={change}
            showCurrent={chosen}
          />
          {status ? (
            <p role="status" className={status.bad ? "text-sm text-bad" : "text-sm text-muted"}>
              {status.text}
            </p>
          ) : null}
        </div>
      }
    />
  );
}
