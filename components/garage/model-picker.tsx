"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { addCatalogVehicle } from "@/app/garage/_lib/actions";
import { CarThumb, VehicleStage } from "@/components/car";
import { setActiveVehicle } from "@/components/home/active-vehicle";
import { CATALOG_STATUS } from "@/components/models/catalog-status";
import { ColorSwatches } from "@/components/models/color-swatches";
import { PowertrainChips } from "@/components/models/model-card";
import { modelFacts, modelYearOptions, paintHex } from "@/components/models/subject";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, SearchBox, Select } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import {
  BRANDS,
  getBrand,
  getModel,
  modelsByBrand,
  modelTitle,
  modelYears,
  searchModels,
  type CarColorId,
  type CarModel,
} from "@/lib/catalog";
import { cn, pluralRu } from "@/lib/utils";

const BRAND_LIST = BRANDS.map((brand) => ({ brand, count: modelsByBrand(brand.id).length })).filter((b) => b.count > 0);
const DOT = { ok: "bg-ok", hand: "bg-hand", warn: "bg-warn" } as Record<string, string>;

// "Выбрать модель": a car without VIN picked from the catalog — brand, model, year and paint. The catalog gives
// the picture and the parts list; compatibility of each part is still checked by a sourcer.
export function ModelPicker({ initialModelId, maxYear, onManual }: { initialModelId: string | null; maxYear: number; onManual: () => void }) {
  const initial = getModel(initialModelId);
  const [brandId, setBrandId] = useState<string | null>(initial?.brandId ?? null);
  const [modelId, setModelId] = useState<string | null>(initial?.id ?? null);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const model = getModel(modelId);
  const brand = getBrand(brandId);
  const found = deferred ? searchModels(deferred, 12) : [];

  function chooseModel(next: CarModel) {
    setBrandId(next.brandId);
    setModelId(next.id);
    setQuery("");
  }

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted">
        Без VIN каталог производителя не откроется. По модели покажем схему и детали, а совместимость проверит подборщик по году,
        фото и описанию.
      </p>

      {model ? (
        <ModelDetails key={model.id} model={model} maxYear={maxYear} onBack={() => setModelId(null)} />
      ) : (
        <>
          <SearchBox
            id="model-search"
            label="Найти модель"
            showLabel
            placeholder="Например: Song Plus, Monjaro, Tiggo 7"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={60}
          />
          {deferred ? (
            found.length ? (
              <ModelGrid models={found} onPick={chooseModel} label="Найденные модели" />
            ) : (
              <p className="rounded-xl bg-soft px-4 py-3 text-sm text-muted" role="status">
                Такой модели в списке нет.{" "}
                <button type="button" onClick={onManual} className="font-semibold text-ink underline">
                  Указать марку и модель вручную
                </button>
              </p>
            )
          ) : brand ? (
            <section aria-labelledby="picker-models" className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="picker-models" className="text-base font-bold">
                  {brand.name}{" "}
                  {brand.nameZh ? (
                    <span className="zh text-sm font-normal text-muted" lang="zh-CN">
                      {brand.nameZh}
                    </span>
                  ) : null}
                </h3>
                <button type="button" onClick={() => setBrandId(null)} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
                  <Icon name="chevron-left" className="size-4" />
                  Все марки
                </button>
              </div>
              <p className="text-sm text-muted">{CATALOG_STATUS[brand.catalogStatus].text}</p>
              <ModelGrid models={modelsByBrand(brand.id)} onPick={chooseModel} label={`Модели ${brand.name}`} />
            </section>
          ) : (
            <section aria-labelledby="picker-brands" className="grid gap-3">
              <h3 id="picker-brands" className="text-base font-bold">
                Марка
              </h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BRAND_LIST.map(({ brand: b, count }) => {
                  const status = CATALOG_STATUS[b.catalogStatus];
                  return (
                    <li key={b.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setBrandId(b.id)}
                        className="flex h-full w-full flex-col items-start gap-0.5 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition hover:border-line-strong hover:bg-soft"
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="truncate font-semibold">{b.name}</span>
                          <span className={cn("size-2 shrink-0 rounded-full", DOT[status.tone])} title={status.label} aria-hidden="true" />
                        </span>
                        <span className="text-xs text-muted">
                          {count} {pluralRu(count, "модель", "модели", "моделей")}
                          {b.nameZh ? (
                            <span className="zh" lang="zh-CN">
                              {" "}
                              · {b.nameZh}
                            </span>
                          ) : null}
                        </span>
                        <span className="sr-only">, {status.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {(["vin_catalog", "manual", "checking"] as const).map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", DOT[CATALOG_STATUS[s].tone])} aria-hidden="true" />
                    {CATALOG_STATUS[s].label}
                  </span>
                ))}
              </p>
            </section>
          )}
          <p className="text-sm text-muted">
            Нет вашей модели?{" "}
            <button type="button" onClick={onManual} className="font-semibold text-ink underline">
              Указать марку и модель вручную
            </button>
          </p>
        </>
      )}
    </div>
  );
}

function ModelGrid({ models, onPick, label }: { models: CarModel[]; onPick: (model: CarModel) => void; label: string }) {
  return (
    <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-3" aria-label={label}>
      {models.map((m) => (
        <li key={m.id} className="min-w-0">
          <button
            type="button"
            onClick={() => onPick(m)}
            className="flex h-full w-full flex-col overflow-hidden rounded-[14px] border border-line bg-card text-left transition hover:border-line-strong"
          >
            <span className="block w-full p-1.5 pb-0">
              <CarThumb body={m.body} color={paintHex(m.defaultColor)} spare={m.spare} />
            </span>
            <span className="grid gap-1 p-3 pt-2">
              <span className="font-bold leading-snug">{modelTitle(m)}</span>
              <span className="text-xs text-muted">
                {modelYears(m)}
                {m.segment ? ` · ${m.segment}` : ""}
              </span>
              <PowertrainChips powertrains={m.powertrains} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ModelDetails({ model, maxYear, onBack }: { model: CarModel; maxYear: number; onBack: () => void }) {
  const router = useRouter();
  const years = modelYearOptions(model, maxYear);
  const [year, setYear] = useState("");
  const [color, setColor] = useState<CarColorId | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const brandStatus = getBrand(model.brandId)?.catalogStatus ?? "checking";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!year) {
      setError("Выберите год выпуска");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await addCatalogVehicle({ modelId: model.id, year: Number(year), color, label: label.trim() || null }).catch(() => null);
    if (result?.ok) {
      setActiveVehicle(result.value.id);
      router.push(`/garage/${result.value.id}`);
      return;
    }
    setError(result?.error ?? "Сервис временно недоступен. Попробуйте ещё раз");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate aria-labelledby="picked-model">
      <VehicleStage
        title={<span id="picked-model">{modelTitle(model)}</span>}
        subtitle={modelFacts(model)}
        carTitle={modelTitle(model)}
        body={model.body}
        color={paintHex(color, model)}
        powertrain={model.powertrains.length === 1 ? model.powertrains[0] : null}
        size="md"
        headingLevel={3}
        topRight={
          <button type="button" onClick={onBack} className="inline-flex min-h-9 items-center gap-1 px-1 text-[13px] font-semibold underline underline-offset-4">
            Другая модель
          </button>
        }
        // Added without a VIN, the car cannot open a catalog: no "Каталог по VIN" promise here.
        bottomLeft={
          <Badge tone="neutral" wrap>
            {brandStatus === "vin_catalog" ? "Без VIN · каталог марки откроется, когда добавите VIN" : "Без VIN · деталь проверит подборщик"}
          </Badge>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Год выпуска" htmlFor="model-year">
          <Select id="model-year" value={year} onChange={(e) => setYear(e.target.value)} required aria-invalid={error === "Выберите год выпуска"}>
            <option value="">Выберите год</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Название, если хотите" htmlFor="model-label" hint="Видно только вам">
          <Input id="model-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} autoComplete="off" />
        </Field>
      </div>
      <ColorSwatches name="model-color" legend="Какого цвета ваша машина?" value={color} onChange={setColor} />
      {error ? (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}
      <Button variant="primary" size="lg" disabled={busy}>
        {busy ? "Добавляем…" : "Добавить в гараж"}
      </Button>
    </form>
  );
}
