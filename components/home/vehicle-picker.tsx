"use client";

import Link from "next/link";
import { Field, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import type { CatalogMode, HomeVehicle } from "@/lib/services/search";
import { cn } from "@/lib/utils";

const CATALOG_NOTE: Record<CatalogMode, string> = {
  catalog: "каталог по VIN",
  catalog_maybe: "каталог может быть пуст",
  not_decoded: "VIN не расшифрован",
  manual: "ручной подбор",
};

// With more cars than this (a workshop's garage) a select is easier than a wall of chips.
const CHIP_LIMIT = 6;

export const hasCatalog = (vehicle: HomeVehicle | null | undefined) =>
  vehicle?.catalog === "catalog" || vehicle?.catalog === "catalog_maybe";

export function VehiclePicker({
  vehicles,
  activeId,
  onSelect,
}: {
  vehicles: HomeVehicle[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!vehicles.length)
    return (
      <p className="px-1 text-sm text-muted">
        Гараж пока пуст. Введите VIN в поиск — добавим машину и откроем её каталог. Нет VIN под рукой?{" "}
        <Link href="/garage/new?mode=manual" className="font-semibold text-ink underline">
          Добавить без VIN
        </Link>
      </p>
    );

  if (vehicles.length > CHIP_LIMIT)
    return (
      <Field
        label="Для какой машины"
        htmlFor="home-vehicle"
        hint={
          <Link href="/garage" className="font-semibold text-ink underline">
            Все машины в гараже
          </Link>
        }
      >
        <Select id="home-vehicle" value={activeId ?? ""} onChange={(e) => onSelect(e.target.value)}>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title} · {CATALOG_NOTE[v.catalog]}
            </option>
          ))}
        </Select>
      </Field>
    );

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 px-1 text-sm font-semibold">Для какой машины</legend>
      <ul className="flex flex-wrap gap-2">
        {vehicles.map((v) => {
          const active = v.id === activeId;
          return (
            <li key={v.id} className="max-w-full">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(v.id)}
                className={cn(
                  "flex min-h-10 max-w-full items-center gap-2 rounded-full border px-3.5 py-1.5 text-left text-sm transition",
                  active ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:bg-soft",
                )}
              >
                {active ? <Icon name="check" className="size-4" /> : <Icon name="car" className="size-4 text-muted" />}
                <span className="min-w-0 truncate font-semibold">{v.title}</span>
                <span className={cn("shrink-0 text-xs", active ? "text-paper/75" : "text-muted")}>{CATALOG_NOTE[v.catalog]}</span>
              </button>
            </li>
          );
        })}
        <li>
          <Link
            href="/garage/new"
            className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-1.5 text-sm font-semibold text-muted hover:bg-soft hover:text-ink"
          >
            <Icon name="plus" className="size-4" />
            Добавить машину
          </Link>
        </li>
      </ul>
    </fieldset>
  );
}
