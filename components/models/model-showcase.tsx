"use client";

import { useState } from "react";
import { getModel, type CarColorId } from "@/lib/catalog";
import { ColorSwatches } from "./color-swatches";
import { StageExplorer } from "./stage-explorer";
import { modelSubject } from "./subject";

// A catalog model on the stage with paints to try on. Nothing is saved: the color is picked for real when the car
// is added to the garage.
export function ModelShowcase({ modelId, signedIn }: { modelId: string; signedIn: boolean }) {
  const model = getModel(modelId);
  const [color, setColor] = useState<CarColorId | null>(model?.defaultColor ?? null);
  if (!model) return null;
  const subject = modelSubject(model, color);
  return (
    <StageExplorer
      subject={subject}
      signedIn={signedIn}
      title="Узлы и детали"
      colorHex={subject.colorHex}
      below={
        <div className="rounded-[14px] border border-line bg-card px-4 py-3">
          <ColorSwatches name="model-color" legend="Цвет на схеме" value={color} onChange={setColor} />
        </div>
      }
    />
  );
}
