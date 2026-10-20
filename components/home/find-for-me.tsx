"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useActiveVehicle } from "./active-vehicle";
import { findForMeHref } from "./links";

// Opens a request for the car picked in the search box.
export function FindForMe({ vehicleIds }: { vehicleIds: string[] }) {
  const activeId = useActiveVehicle(vehicleIds);
  return (
    <Link
      href={findForMeHref(activeId)}
      className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 transition hover:border-muted sm:p-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-hand-bg text-hand">
        <Icon name="spark" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="font-bold">Не нашли? Найдём за вас</span>
        <span className="text-sm text-muted">
          Опишите деталь своими словами или приложите фото. Подборщик найдёт номер, проверит совместимость и назовёт цену в ₸.
        </span>
      </span>
      <Icon name="arrow" className="text-muted" />
    </Link>
  );
}
