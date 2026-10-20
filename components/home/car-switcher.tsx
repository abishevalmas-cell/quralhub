"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { CarThumb } from "@/components/car";
import { carSubject, modelFacts, paintHex, type StageSubject } from "@/components/models/subject";
import { SearchBox } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { MODELS, modelTitle, searchModels, type CarModel } from "@/lib/catalog";
import type { HomeCar } from "@/lib/services/search";
import { cn } from "@/lib/utils";

// With an empty search: the most common model of each brand, so the list is not eight BYDs.
const SUGGESTED: CarModel[] = (() => {
  const brands = new Set<string>();
  const out: CarModel[] = [];
  for (const model of MODELS)
    if (model.popular && !brands.has(model.brandId)) {
      brands.add(model.brandId);
      out.push(model);
    }
  return out.slice(0, 8);
})();

// The car switcher behind the vehicle pill: the garage first, then any catalog model to look at.
// A native modal dialog: Esc and the backdrop close it, focus returns to the pill.
export function CarSwitcher({
  open,
  onClose,
  cars,
  subject,
  signedIn,
  onPickCar,
  onPickModel,
}: {
  open: boolean;
  onClose: () => void;
  cars: HomeCar[];
  subject: StageSubject;
  signedIn: boolean;
  onPickCar: (id: string) => void;
  onPickModel: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const found: CarModel[] = deferred.trim() ? searchModels(deferred, 12) : SUGGESTED;

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="sheet p-0"
      aria-labelledby="switcher-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="grid gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{cars.length ? "Мой автомобиль" : "Поиск деталей"}</p>
            <h2 id="switcher-title" className="mt-1 text-[23px] font-bold tracking-[-0.03em]">
              Для какой машины ищем?
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-soft hover:bg-line">
            <Icon name="close" className="size-5" />
            <span className="sr-only">Закрыть</span>
          </button>
        </div>

        {cars.length ? (
          <section aria-labelledby="switcher-garage" className="grid gap-2">
            <h3 id="switcher-garage" className="text-sm font-semibold">
              Мой гараж
            </h3>
            <ul className="grid gap-2">
              {cars.map((car) => {
                const s = carSubject(car);
                const current = subject.kind === "vehicle" && subject.vehicleId === car.id;
                return (
                  <li key={car.id}>
                    <Option current={current} onClick={() => onPickCar(car.id)} thumb={s} title={s.title} subtitle={s.subtitle || "Машина в гараже"} />
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="switcher-models" className="grid gap-2">
          <h3 id="switcher-models" className="text-sm font-semibold">
            {cars.length ? "Другая модель" : "Выберите модель"}
          </h3>
          <SearchBox
            id="switcher-search"
            label="Марка или модель"
            placeholder="Марка или модель: Song Plus, Monjaro, Tiggo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={60}
          />
          {found.length ? (
            <ul className="grid gap-2" aria-live="polite">
              {found.map((model) => (
                <li key={model.id}>
                  <Option
                    current={subject.kind === "model" && subject.modelId === model.id}
                    onClick={() => onPickModel(model.id)}
                    thumb={{ body: model.body, colorHex: paintHex(model.defaultColor), spare: model.spare ?? true }}
                    title={modelTitle(model)}
                    subtitle={modelFacts(model)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl bg-soft px-4 py-3 text-sm text-muted" role="status">
              Такой модели в списке нет. Добавьте машину по VIN — подборщик разберётся с любой китайской маркой.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4 text-sm font-semibold">
          <Link href="/models" className="inline-flex min-h-10 items-center gap-1.5 underline-offset-4 hover:underline">
            <Icon name="grid" className="size-4" />
            Все модели
          </Link>
          <Link href={signedIn ? "/garage/new" : "/login?next=%2Fgarage%2Fnew"} className="inline-flex min-h-10 items-center gap-1.5 underline-offset-4 hover:underline">
            <Icon name="plus" className="size-4" />
            Добавить машину в гараж
          </Link>
        </div>
      </div>
    </dialog>
  );
}

function Option({
  current,
  onClick,
  thumb,
  title,
  subtitle,
}: {
  current: boolean;
  onClick: () => void;
  thumb: Pick<StageSubject, "body" | "colorHex" | "spare">;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={current}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-2 pr-3 text-left transition",
        current ? "border-ink bg-soft" : "border-line bg-card hover:border-line-strong hover:bg-soft",
      )}
    >
      <CarThumb body={thumb.body} color={thumb.colorHex} spare={thumb.spare} className="w-24 shrink-0 sm:w-28" />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-semibold">{title}</span>
        <span className="line-clamp-2 text-xs text-muted">{subtitle}</span>
      </span>
      {current ? <Icon name="check" className="size-5 shrink-0" /> : null}
    </button>
  );
}
