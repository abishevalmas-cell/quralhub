"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AXIS_LABEL, SIDE_LABEL } from "@/components/requests/labels";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { ApiError, api } from "@/lib/client/api";
import type { HomeVehicle } from "@/lib/services/search";
import { getPartType, groupLabels, zhLabel, type Axis, type PartType, type Side } from "@/lib/taxonomy";
import { VIN_LENGTH } from "@/lib/vin";
import { cn } from "@/lib/utils";
import { setActiveVehicle, useActiveVehicle } from "./active-vehicle";
import { analyzeQuery, missingPlacement, SEARCH_MAX_LENGTH, type OeView, type SearchView, type TextView, type VinView } from "./analyze";
import { clearStashedQuery, readStashedQuery, stashPhotos, stashQuery } from "./handoff";
import { garageHref, loginHref, oeRequestHref, partRequestHref, photoRequestHref, requestParams, vehicleCatalogHref } from "./links";
import { hasCatalog, VehiclePicker } from "./vehicle-picker";

// Must match INVALID_VIN in lib/services/vehicles.ts: "invalid_vin:<VIN>,<VIN>" carries suggested fixes.
const INVALID_VIN_PREFIX = "invalid_vin:";
const EXAMPLES = ["колодки передние", "левая фара", "фильтр салона"];
const noSubscribe = () => () => {};

type Placement = { partId: string | null; axis?: Axis | null; side?: Side | null };
type Failure = { query: string; message: string; suggestions: string[] };
type Selection = { part: PartType | null; axis: Axis | null; side: Side | null };

function textSelection(view: TextView, partPick: string | null, placement: Placement): Selection {
  const selectedId = partPick && view.matches.some((p) => p.id === partPick) ? partPick : view.preselected;
  const part = getPartType(selectedId);
  const own: Partial<Placement> = part && placement.partId === part.id ? placement : {};
  return {
    part,
    axis: own.axis !== undefined ? own.axis : view.axis,
    side: own.side !== undefined ? own.side : view.side,
  };
}

function statusText(view: SearchView): string {
  switch (view.kind) {
    case "empty":
      return "";
    case "vin":
      return view.ok ? "VIN без ошибок" : view.errors.length ? "В VIN ошибка" : `VIN: ${view.length} из ${VIN_LENGTH}`;
    case "oe":
      return `Номер детали ${view.oe}`;
    default:
      return view.matches.length ? `Нашли деталей: ${view.matches.length}` : "Деталь не узнали";
  }
}

export function SmartSearch({ signedIn, vehicles }: { signedIn: boolean; vehicles: HomeVehicle[] }) {
  const router = useRouter();
  const ids = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const activeId = useActiveVehicle(ids);
  const active = vehicles.find((v) => v.id === activeId) ?? null;
  // A query typed before login comes back from sessionStorage; once the customer edits it, local state wins.
  const stashed = useSyncExternalStore(noSubscribe, readStashedQuery, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const query = typed ?? stashed;
  const view = useMemo(() => analyzeQuery(query), [query]);
  const [partPick, setPartPick] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement>({ partId: null });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const shownFailure = failure?.query === query ? failure : null;

  const selection: Selection | null =
    view.kind === "text" ? textSelection(view, partPick, placement) : view.kind === "oe" ? { part: view.part, axis: view.axis, side: view.side } : null;
  const requestHref =
    view.kind === "oe"
      ? oeRequestHref({ vehicleId: activeId, oe: view.oe, part: view.part, axis: view.axis, side: view.side })
      : view.kind === "text" && selection
        ? partRequestHref({ vehicleId: activeId, part: selection.part, axis: selection.axis, side: selection.side, q: query })
        : null;

  function change(value: string) {
    setTyped(value);
    if (stashed) clearStashedQuery();
  }

  function go(href: string) {
    clearStashedQuery();
    router.push(href);
  }

  function toLogin(next = "/") {
    stashQuery(query);
    router.push(loginHref(next));
  }

  async function addVehicle(vin: string) {
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await api<{ vehicle: { id: string } }>("/api/vehicles", { body: { vin } });
      clearStashedQuery();
      setActiveVehicle(result.vehicle.id);
      router.push(garageHref(result.vehicle.id));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      setFailure({
        query,
        message: (error as Error).message,
        suggestions: code?.startsWith(INVALID_VIN_PREFIX) ? code.slice(INVALID_VIN_PREFIX.length).split(",").filter(Boolean) : [],
      });
      setBusy(false);
    }
  }

  function findOe(oe: string, part: PartType | null = null) {
    const href = oeRequestHref({ vehicleId: activeId, oe, part });
    if (signedIn) go(href);
    else toLogin();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (view.kind === "empty") return;
    if (!signedIn) return toLogin();
    if (view.kind === "vin") {
      if (view.ok) void addVehicle(view.vin);
      return;
    }
    if (requestHref) go(requestHref);
  }

  function pickPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    stashPhotos(files);
    // What was typed goes along, except a VIN: the car is chosen from the garage instead.
    const target = photoRequestHref(activeId, requestHref ? requestParams(requestHref) : []);
    if (signedIn) go(target);
    else toLogin(target);
  }

  return (
    <div className="grid gap-3">
      <form onSubmit={submit} role="search" className="grid gap-3 rounded-2xl border border-line bg-card p-3 sm:p-4">
        <div className="grid gap-1.5">
          <label htmlFor="home-search" className="px-1 text-sm font-semibold">
            VIN, номер детали или что нужно
          </label>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="home-search"
                type="search"
                value={query}
                onChange={(e) => change(e.target.value)}
                placeholder="Например: колодки передние"
                maxLength={SEARCH_MAX_LENGTH}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="search"
                aria-describedby="home-search-hint"
                className="h-12 pl-11 text-base!"
              />
            </div>
            <input id="home-photo" type="file" accept="image/*" multiple className="peer sr-only" onChange={pickPhotos} />
            <label
              htmlFor="home-photo"
              title="Фото детали"
              className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-xl bg-soft text-ink transition hover:bg-line peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime-ink"
            >
              <Icon name="camera" />
              <span className="sr-only">Фото детали</span>
            </label>
          </div>
          <p id="home-search-hint" className="px-1 text-xs text-muted">
            Фото приложим к заявке; распознавание по фото скоро.
          </p>
        </div>
        {signedIn ? <VehiclePicker vehicles={vehicles} activeId={activeId} onSelect={setActiveVehicle} /> : null}
      </form>

      <p className="sr-only" aria-live="polite">
        {statusText(view)}
      </p>

      {view.kind === "empty" ? (
        <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
          <span className="text-muted">Попробуйте:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => change(example)}
              className="rounded-full border border-line bg-card px-3 py-1.5 font-semibold hover:bg-soft"
            >
              {example}
            </button>
          ))}
        </div>
      ) : view.kind === "vin" ? (
        <VinPanel
          view={view}
          signedIn={signedIn}
          busy={busy}
          failure={shownFailure}
          onFix={(vin) => change(vin)}
          onAdd={() => (signedIn ? void addVehicle(view.vin) : toLogin())}
          onOe={(oe) => findOe(oe)}
        />
      ) : view.kind === "oe" ? (
        <OePanel view={view} active={active} signedIn={signedIn} onFind={() => findOe(view.oe, view.part)} />
      ) : (
        <TextPanel
          view={view}
          selection={selection ?? { part: null, axis: null, side: null }}
          active={active}
          signedIn={signedIn}
          onPick={(id) => setPartPick(id)}
          onPlacement={(next) => setPlacement(next)}
          onRequest={() => (signedIn && requestHref ? go(requestHref) : toLogin())}
        />
      )}
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <Card className="grid gap-3 p-4 sm:p-5">{children}</Card>;
}

function Actions({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="grid gap-2 pt-1">
      <div className="flex flex-wrap gap-2">{children}</div>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
}

function VinPanel({
  view,
  signedIn,
  busy,
  failure,
  onFix,
  onAdd,
  onOe,
}: {
  view: VinView;
  signedIn: boolean;
  busy: boolean;
  failure: Failure | null;
  onFix: (vin: string) => void;
  onAdd: () => void;
  onOe: (oe: string) => void;
}) {
  const typing = view.length < VIN_LENGTH;
  const status: { tone: Tone; label: string } = view.ok
    ? { tone: "ok", label: "VIN без ошибок" }
    : typing && !view.errors.length
      ? { tone: "neutral", label: `VIN: ${view.length} из ${VIN_LENGTH}` }
      : { tone: "bad", label: "В VIN ошибка" };
  const suggestions = [...new Set([...view.suggestions, ...(failure?.suggestions ?? [])])].filter((s) => s !== view.vin);
  const maker = view.maker
    ? [view.brands.length ? `${view.maker} (${view.brands.join(", ")})` : view.maker, view.year ? `${view.year} модельный год` : null]
        .filter(Boolean)
        .join(" · ")
    : view.complete && view.china
      ? ["Китайский производитель", view.year ? `${view.year} модельный год` : null].filter(Boolean).join(" · ")
      : null;

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        <span className="min-w-0 break-all font-mono text-[15px] font-semibold tracking-wide">{view.vin}</span>
      </div>
      {maker ? (
        <p className="text-[15px]">
          <span className="text-muted">По VIN: </span>
          <span className="font-semibold">{maker}</span>
          {view.confidence === "likely" ? <span className="text-muted"> · уточним при расшифровке</span> : null}
        </p>
      ) : null}
      {view.errors.map((e) => (
        <p key={e.code} className="text-sm text-bad">
          {e.message}
        </p>
      ))}
      {view.warnings.map((w) => (
        <p key={w.code} className="text-sm text-warn">
          {w.message}
        </p>
      ))}
      {failure && !view.errors.length ? (
        <p className="text-sm text-bad" role="alert">
          {failure.message}
        </p>
      ) : null}
      {suggestions.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Исправить на</span>
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onFix(s)} className="rounded-lg bg-soft px-2.5 py-1.5 font-mono font-semibold hover:bg-line">
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {view.part ? (
        <p className="text-sm text-muted">Деталь «{view.part.ru}» закажем, когда машина будет в гараже.</p>
      ) : null}
      {view.ok || view.oe ? (
        <Actions note={view.ok ? "Расшифруем VIN, покажем модель и комплектацию и откроем каталог, если он есть для этой машины." : undefined}>
          {view.ok ? (
            <Button type="button" variant="primary" onClick={onAdd} disabled={busy}>
              <Icon name="car" />
              {busy ? "Расшифровываем…" : signedIn ? "Добавить в гараж" : "Войти и добавить машину"}
            </Button>
          ) : null}
          {view.oe ? (
            <Button type="button" variant="soft" onClick={() => onOe(view.oe as string)}>
              Это номер детали
            </Button>
          ) : null}
        </Actions>
      ) : typing && !view.errors.length ? (
        <p className="text-sm text-muted">VIN есть в техпаспорте и под лобовым стеклом: 17 латинских букв и цифр.</p>
      ) : null}
    </Panel>
  );
}

function OePanel({ view, active, signedIn, onFind }: { view: OeView; active: HomeVehicle | null; signedIn: boolean; onFind: () => void }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Номер детали</Badge>
        <span className="min-w-0 break-all font-mono text-[15px] font-semibold">{view.oe}</span>
      </div>
      {view.part ? (
        <p className="flex flex-wrap items-baseline gap-x-2 text-[15px]">
          <span className="text-muted">Похоже на</span>
          <span className="font-semibold">{view.part.ru}</span>
          <span className="zh text-sm text-muted" lang="zh-CN">
            {zhLabel(view.part, view.axis, view.side)}
          </span>
        </p>
      ) : null}
      <Actions
        note={`Подборщик найдёт деталь по номеру, проверит, подходит ли она ${active ? `к «${active.title}»` : "к вашей машине"}, и назовёт цену в ₸.`}
      >
        <Button type="button" variant="primary" onClick={onFind}>
          <Icon name="search" />
          {signedIn ? "Найти номер" : "Войти и найти номер"}
        </Button>
      </Actions>
    </Panel>
  );
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition",
        pressed ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:bg-soft",
      )}
    >
      {children}
    </button>
  );
}

function TextPanel({
  view,
  selection,
  active,
  signedIn,
  onPick,
  onPlacement,
  onRequest,
}: {
  view: TextView;
  selection: Selection;
  active: HomeVehicle | null;
  signedIn: boolean;
  onPick: (id: string) => void;
  onPlacement: (next: Placement) => void;
  onRequest: () => void;
}) {
  const { part, axis, side } = selection;
  const missing = missingPlacement(part, axis, side);
  const showAxis = Boolean(part && (part.needsAxis || axis));
  const showSide = Boolean(part && (part.needsSide || side));
  const setAxis = (value: Axis) => onPlacement({ partId: part?.id ?? null, axis: axis === value ? null : value, side });
  const setSide = (value: Side) => onPlacement({ partId: part?.id ?? null, axis, side: side === value ? null : value });
  const catalog = signedIn && active && hasCatalog(active) ? active : null;

  return (
    <Panel>
      {view.matches.length ? (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold">{part ? "Деталь" : "Какая деталь нужна?"}</legend>
          <ul className="grid gap-2">
            {view.matches.map((p) => {
              const pressed = p.id === part?.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => onPick(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                      pressed ? "border-ink bg-soft" : "border-line bg-card hover:bg-soft",
                    )}
                  >
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="font-semibold">{p.ru}</span>
                      <span className="zh text-sm text-muted" lang="zh-CN">
                        {zhLabel(p, axis, side)}
                      </span>
                    </span>
                    <span className="hidden text-xs text-muted sm:inline">{groupLabels[p.group]}</span>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", pressed ? "bg-ink text-paper" : "border border-line")}>
                      {pressed ? <Icon name="check" className="size-4" /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : (
        <p className="text-[15px]">
          Не узнали деталь. Ничего страшного: создайте заявку, подборщик разберётся по описанию и фото.
        </p>
      )}

      {showAxis ? (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Ось</legend>
          <div className="flex flex-wrap gap-2">
            {(["front", "rear"] as const).map((value) => (
              <Chip key={value} pressed={axis === value} onClick={() => setAxis(value)}>
                {AXIS_LABEL[value]}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : null}
      {showSide ? (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Сторона</legend>
          <div className="flex flex-wrap gap-2">
            {(["left", "right"] as const).map((value) => (
              <Chip key={value} pressed={side === value} onClick={() => setSide(value)}>
                {SIDE_LABEL[value]}
              </Chip>
            ))}
          </div>
        </fieldset>
      ) : null}
      {missing.hint ? (
        <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn" role="status">
          {missing.hint}
        </p>
      ) : null}

      <Actions
        note={
          catalog
            ? catalog.catalog === "catalog_maybe"
              ? "Каталог для этой машины может оказаться пустым. Тогда отправьте заявку — подборщик найдёт деталь сам."
              : "В каталоге номер детали именно для вашего VIN. Или отправьте заявку — подборщик найдёт сам."
            : signedIn && !active
              ? "Машина не выбрана: подборщик спросит VIN в чате. С машиной из гаража подбор точнее."
              : null
        }
      >
        <Button type="button" variant="primary" onClick={onRequest}>
          {signedIn ? "Создать заявку" : "Войти и создать заявку"}
        </Button>
        {catalog ? (
          <ButtonLink href={vehicleCatalogHref(catalog.id)} variant="soft">
            Открыть каталог машины
          </ButtonLink>
        ) : null}
      </Actions>
    </Panel>
  );
}
