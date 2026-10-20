import { CAR_COLORS, luminance } from "@/components/car/colors";
import { Icon } from "@/components/ui/icon";
import type { CarColorId } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// Paint swatches as a radio group: arrow keys move between colors, the label names the color for screen readers.
// The nine swatches stay on one row on a 390px phone: a 9-column grid there, 36px circles from sm up.
export function ColorSwatches({
  name,
  legend,
  value,
  onChange,
  disabled = false,
  showLegend = true,
  showCurrent = true,
}: {
  name: string;
  legend: string;
  value: string | null;
  onChange: (color: CarColorId) => void;
  disabled?: boolean;
  showLegend?: boolean;
  /** Name the chosen color after the legend ("Цвет · Серый металлик"). */
  showCurrent?: boolean;
}) {
  const current = CAR_COLORS.find((c) => c.id === value);
  return (
    <fieldset className="grid min-w-0 gap-2" disabled={disabled}>
      <legend className={showLegend ? "mb-2 text-sm font-semibold" : "sr-only"}>
        {legend}
        {current && showLegend && showCurrent ? <span className="font-normal text-muted"> · {current.label}</span> : null}
      </legend>
      <div className="grid grid-cols-9 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
        {CAR_COLORS.map((color) => {
          const checked = color.id === value;
          return (
            <label key={color.id} title={color.label} className="relative grid cursor-pointer place-items-center">
              <input
                type="radio"
                name={name}
                value={color.id}
                checked={checked}
                onChange={() => onChange(color.id as CarColorId)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  "grid aspect-square w-full max-w-9 place-items-center rounded-full border border-line-strong transition sm:size-9",
                  "shadow-[inset_0_-6px_10px_rgb(0_0_0/0.18),inset_0_4px_8px_rgb(255_255_255/0.35)]",
                  "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime-ink",
                  checked ? "ring-2 ring-ink ring-offset-2 ring-offset-card" : "hover:scale-105",
                )}
                style={{ backgroundColor: color.hex }}
              >
                {checked ? (
                  <Icon name="check" strokeWidth={2.4} className={cn("size-4", luminance(color.hex) > 0.4 ? "text-[#17232c]" : "text-white")} />
                ) : null}
              </span>
              <span className="sr-only">{color.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
