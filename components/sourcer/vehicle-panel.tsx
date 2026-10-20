import { CopyButton } from "@/components/garage/copy-button";
import { formatBuildDate } from "@/components/garage/labels";
import { Badge } from "@/components/ui/badge";
import { KeyValue } from "@/components/ui/card";
import type { StaffRequestView } from "@/lib/services/sourcing";
import { cn } from "@/lib/utils";
import { decodeLabel } from "./labels";
import { Zh } from "./zh";

type Vehicle = NonNullable<StaffRequestView["vehicle"]>;

// The full VIN is shown here on purpose: the sourcer pastes it into supplier catalogs.
export function VehiclePanel({ vehicle }: { vehicle: Vehicle | null }) {
  if (!vehicle) {
    return <p className="text-sm text-muted">Клиент не указал машину. Попросите VIN или фото таблички в переписке.</p>;
  }
  const current = vehicle.current;
  const decode = current ? decodeLabel(current) : null;
  const items: [React.ReactNode, React.ReactNode][] = [["Машина", vehicle.label]];
  if (vehicle.vin)
    items.push([
      "VIN",
      <span key="vin" className="flex items-center gap-1">
        <span className="break-all font-mono text-[15px] tracking-wide">{vehicle.vin}</span>
        <CopyButton value={vehicle.vin} label="Скопировать VIN" />
      </span>,
    ]);
  const trim = current?.trim ?? vehicle.trim;
  items.push([
    <>
      Комплектация <Zh>配置</Zh>
    </>,
    trim || <span className="text-muted">не уточнена</span>,
  ]);
  if (vehicle.year) items.push(["Год", String(vehicle.year)]);
  const built = formatBuildDate(current?.buildDate);
  if (built) items.push(["Дата выпуска", built]);
  const epc = current?.epc ?? vehicle.epc;
  if (epc) items.push(["Каталог EPC", <span key="epc" className="font-mono">{epc}</span>]);

  const candidates = current?.candidates ?? [];
  const unresolved = current?.decodeStatus === "ambiguous" && !candidates.some((c) => c.id === current.selectedCandidateId);

  return (
    <div className="grid gap-3">
      {decode ? (
        <div>
          <Badge tone={decode.tone}>
            {decode.label} <Zh className="ml-1 font-normal">{decode.zh}</Zh>
          </Badge>
        </div>
      ) : null}
      <KeyValue items={items} />
      {!current ? (
        <p className="text-sm text-muted">Клиент удалил машину из гаража. Показаны данные на момент заявки.</p>
      ) : current.archived ? (
        <p className="text-sm text-muted">Машина в архиве гаража клиента.</p>
      ) : null}
      {unresolved ? (
        <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn">
          VIN подходит к нескольким комплектациям, клиент свою не выбрал. Уточните по табличке на двери или фото, прежде чем
          ставить «Подходит по VIN».
        </p>
      ) : null}
      {candidates.length ? (
        <details className="group rounded-xl border border-line" open={unresolved}>
          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold">
            Комплектации по VIN: {candidates.length} <Zh className="font-normal text-muted">配置列表</Zh>
          </summary>
          <ul className="grid gap-2 border-t border-line p-3">
            {candidates.map((c) => {
              const selected = c.id === current?.selectedCandidateId || (current?.decodeStatus === "decoded" && candidates.length === 1);
              const details = [c.year && `${c.year} г.`, c.engine && `двигатель ${c.engine}`, c.fuel, c.drive].filter(Boolean).join(" · ");
              return (
                <li key={c.id} className={cn("grid gap-0.5 rounded-lg border px-3 py-2 text-sm", selected ? "border-ok" : "border-line")}>
                  <span className="font-semibold">{c.version || c.description || "Без названия"}</span>
                  {details ? <span className="text-muted">{details}</span> : null}
                  {c.epcId ? <span className="font-mono text-xs text-muted">EPC {c.epcId}</span> : null}
                  {selected ? (
                    <span className="mt-1">
                      <Badge tone="ok">{current?.decodeStatus === "decoded" ? "Совпадает с VIN" : "Выбрал клиент"}</Badge>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
