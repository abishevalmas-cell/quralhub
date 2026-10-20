"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CarThumb } from "@/components/car";
import { setActiveVehicle, useActiveVehicle } from "@/components/home/active-vehicle";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { GarageCard } from "./garage-car";

// The garage as picture cards. The active car (the one the home page and the search work for) is kept in this
// browser, so the marker and the "Сделать активной" button are client-side.
export function GarageGrid({ cars }: { cars: GarageCard[] }) {
  const ids = useMemo(() => cars.map((c) => c.id), [cars]);
  const activeId = useActiveVehicle(ids);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {cars.map((car) => (
        <li key={car.id} className="min-w-0">
          <GarageCarCard car={car} active={car.id === activeId} />
        </li>
      ))}
      <li className="min-w-0">
        <Link
          href="/garage/new"
          className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-line-strong bg-card p-6 text-center transition hover:border-ink/40 hover:bg-soft"
        >
          <span className="grid size-12 place-items-center rounded-full bg-strong text-strong-lime">
            <Icon name="plus" />
          </span>
          <span className="font-bold">Добавить машину</span>
          <span className="max-w-[16rem] text-sm text-muted">По VIN — с каталогом деталей, или выберите модель из списка</span>
        </Link>
      </li>
    </ul>
  );
}

function GarageCarCard({ car, active }: { car: GarageCard; active: boolean }) {
  const s = car.subject;
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[18px] border bg-card transition hover:border-line-strong",
        active ? "border-dot ring-1 ring-dot" : "border-line",
      )}
    >
      <div className="p-2 pb-0">
        <CarThumb body={s.body} color={s.colorHex} powertrain={s.powertrain} spare={s.spare} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 text-lg font-bold leading-snug tracking-[-0.02em] [overflow-wrap:anywhere]">
            <Link href={`/garage/${car.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {car.title}
            </Link>
          </h2>
          {active ? (
            <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-strong px-2.5 py-1 text-[11px] font-semibold text-strong-lime">
              <span className="size-1.5 rounded-full bg-strong-lime" aria-hidden="true" />
              Активная
            </span>
          ) : null}
        </div>
        {car.details ? <p className="text-sm text-muted">{car.details}</p> : null}
        {s.genericBody ? <p className="text-xs text-muted">Модели нет в нашем списке — машина на картинке условная</p> : null}
        {car.colorChosen ? null : (
          <Link href={`/garage/${car.id}#stage`} className="relative z-10 w-fit text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink">
            Какого цвета ваша машина?
          </Link>
        )}
        {car.maskedVin ? (
          <p className="font-mono text-sm text-muted">
            <span className="sr-only">VIN </span>
            {car.maskedVin}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <Badge tone={car.badge.tone}>{car.badge.label}</Badge>
          {active ? null : (
            <button
              type="button"
              onClick={() => setActiveVehicle(car.id)}
              aria-label={`Сделать активной: ${car.title}`}
              className="relative z-10 inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-[13px] font-semibold text-ink underline decoration-1 underline-offset-4 hover:bg-soft"
            >
              Сделать активной
            </button>
          )}
        </div>
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[18px] group-has-[a:focus-visible]:outline-3 group-has-[a:focus-visible]:outline-lime-ink" />
    </article>
  );
}
