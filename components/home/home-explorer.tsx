"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { stageLinkClass } from "@/components/car";
import { AssortmentGrid } from "@/components/models/assortment-grid";
import { StageExplorer } from "@/components/models/stage-explorer";
import { resolveSubject } from "@/components/models/subject";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { HomeCar } from "@/lib/services/search";
import { setActiveVehicle, useActiveVehicle } from "./active-vehicle";
import { CarSwitcher } from "./car-switcher";
import { garageHref, loginHref } from "./links";
import { ModeCards } from "./mode-cards";
import { SmartSearch } from "./smart-search";

// The top of the home page in the original Tetix layout: heading with the vehicle pill, the vehicle stage, the big
// search, the three ways in and the parts assortment. A client component because the active car lives in this
// browser (see active-vehicle.ts).
export function HomeExplorer({ signedIn, cars }: { signedIn: boolean; cars: HomeCar[] }) {
  const params = useSearchParams();
  const ids = useMemo(() => cars.map((c) => c.id), [cars]);
  const activeId = useActiveVehicle(ids);
  const subject = resolveSubject(cars, activeId, params.get("model"));
  const [switching, setSwitching] = useState(false);

  function pickCar(id: string) {
    setActiveVehicle(id);
    // Next.js keeps useSearchParams in sync with history calls, so the stage follows without a server round trip.
    window.history.replaceState(null, "", "/");
    setSwitching(false);
  }

  function pickModel(id: string) {
    window.history.pushState(null, "", `/?model=${encodeURIComponent(id)}`);
    setSwitching(false);
  }

  // A garage car is "Мой автомобиль"; the fallback model and a browsed one are only examples, never the visitor's car.
  const own = subject.kind === "vehicle";
  const browsing = !own && Boolean(params.get("model"));
  const addHref = signedIn ? "/garage/new" : loginHref("/garage/new");
  const topRight = own ? (
    <div className="flex flex-col items-end gap-1.5">
      {subject.trimPending && subject.vehicleId ? (
        <Link
          href={`${garageHref(subject.vehicleId)}#trim`}
          aria-label="Уточните комплектацию"
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-warn-bg px-3 text-[11px] font-semibold text-warn ring-1 ring-warn/25 transition hover:ring-warn/50 sm:text-xs"
        >
          <span className="size-1.5 rounded-full bg-warn" aria-hidden="true" />
          {/* A phone's stage is narrow: the short word keeps the car's name on one line. */}
          <span className="sm:hidden">Комплектация</span>
          <span className="hidden sm:inline">Уточните комплектацию</span>
        </Link>
      ) : null}
      {subject.hasVin ? (
        <button type="button" className={stageLinkClass} onClick={() => setSwitching(true)} aria-haspopup="dialog">
          Сменить машину
        </button>
      ) : (
        <Link href="/garage/new" className={stageLinkClass}>
          Добавить VIN
        </Link>
      )}
    </div>
  ) : (
    <Link href={addHref} className={stageLinkClass}>
      Добавить свою машину
    </Link>
  );

  return (
    <>
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <p className="eyebrow">{own ? "Мой автомобиль" : browsing ? "Модель из каталога" : "Пример модели"}</p>
          <h1 className="mt-2 text-[25px] font-bold leading-[1.18] tracking-[-0.03em] text-balance min-[400px]:text-[27px] sm:text-[34px] sm:tracking-[-0.035em]">
            Найдём нужную деталь
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setSwitching(true)}
          aria-haspopup="dialog"
          aria-label={own ? `${subject.title}: сменить машину` : "Выбрать машину"}
          className="mb-1 flex min-h-10 max-w-[45%] shrink-0 items-center gap-2 rounded-[30px] border border-line bg-card px-3 py-2 text-[11px] font-semibold transition hover:border-line-strong sm:max-w-xs sm:gap-2.5 sm:px-3.5 sm:text-[13px]"
        >
          {/* The green dot marks the visitor's own car, as in the original; an example model has none. */}
          {own ? <span className="size-[7px] shrink-0 rounded-full bg-dot" aria-hidden="true" /> : null}
          <span className="truncate">{own ? subject.title : "Выбрать машину"}</span>
          <Icon name="car" className={cn("size-5 shrink-0", own && "hidden sm:block")} />
        </button>
      </div>

      {/* Sibling keys must differ: two children of one fragment with the same key confuse React (both stages stayed). */}
      <StageExplorer key={`stage:${subject.key}`} subject={subject} signedIn={signedIn} topRight={topRight} />

      <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-3.5">
        <SmartSearch signedIn={signedIn} vehicles={cars} vehicleId={subject.vehicleId} />
        <ModeCards
          signedIn={signedIn}
          vehicleId={subject.vehicleId}
          extra={subject.kind === "model" ? [["q", `Для ${subject.title}`]] : undefined}
        />
      </div>

      <AssortmentGrid
        key={`parts:${subject.key}`}
        subject={subject}
        signedIn={signedIn}
        title={own ? "Детали для вашего авто" : `Детали для ${subject.title}`}
      />

      <CarSwitcher
        open={switching}
        onClose={() => setSwitching(false)}
        cars={cars}
        subject={subject}
        signedIn={signedIn}
        onPickCar={pickCar}
        onPickModel={pickModel}
      />
    </>
  );
}
