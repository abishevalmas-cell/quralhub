"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { peekPendingPhotos, takePendingPhotos } from "@/components/home/handoff";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import type { RequestDraft } from "@/lib/services/requests";
import { getPartType, parseQuery, zhLabel, type Axis, type ParsedQuery, type PartType, type Side } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { AXIS_LABEL, SIDE_LABEL } from "./labels";

type VehicleOption = { id: string; label: string };

const NO_VEHICLE = "none";
const MAX_QTY = 50;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// The best match is used only when it is clearly ahead: one generic word ("фильтр") or two close
// candidates means the customer has to say which part it is.
function suggest(parsed: ParsedQuery): { best: PartType | null; options: PartType[] } {
  const [top, second] = parsed.matches;
  if (!top) return { best: null, options: [] };
  const p = top.partType;
  const guessOnly = (p.needsAxis && !parsed.axis && !parsed.missing.includes("axis")) || (p.needsSide && !parsed.side && !parsed.missing.includes("side"));
  const close = Boolean(second && second.score >= top.score * 0.85);
  return { best: guessOnly || close ? null : p, options: parsed.matches.slice(0, 4).map((m) => m.partType) };
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
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

export function RequestForm({ vehicles, draft }: { vehicles: VehicleOption[]; draft: RequestDraft }) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(
    draft.vehicleId ?? (vehicles.length === 1 ? vehicles[0].id : vehicles.length ? "" : NO_VEHICLE),
  );
  const [title, setTitle] = useState(draft.title);
  // undefined: follow what the text says; null: the customer turned it off; a value: the customer chose it.
  const [partChoice, setPartChoice] = useState<string | null | undefined>(draft.partTypeId ?? undefined);
  const [axisChoice, setAxisChoice] = useState<Axis | null | undefined>(draft.axis ?? undefined);
  const [sideChoice, setSideChoice] = useState<Side | null | undefined>(draft.side ?? undefined);
  const [description, setDescription] = useState(draft.description);
  // Photos picked with the home camera button. They live in memory only, so after a reload there are none.
  const [photos, setPhotos] = useState<File[]>(() => (draft.withPhotos && typeof window !== "undefined" ? peekPendingPhotos() : []));
  const [progress, setProgress] = useState<string | null>(null);
  const [oe, setOe] = useState(draft.oe);
  const [qtyText, setQtyText] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => parseQuery(title), [title]);
  const suggestion = suggest(parsed);
  const part = partChoice === undefined ? suggestion.best : getPartType(partChoice);
  const axis = axisChoice === undefined ? parsed.axis : axisChoice;
  const side = sideChoice === undefined ? parsed.side : sideChoice;
  const qty = qtyText ?? String(parsed.qty && parsed.qty <= MAX_QTY ? parsed.qty : 1);
  const others = suggestion.options.filter((p) => p.id !== part?.id);
  const missingAxis = Boolean(part?.needsAxis && !axis);
  const missingSide = Boolean(part?.needsSide && !side);
  const missingHint =
    missingAxis && missingSide
      ? "Укажите ось и сторону: у передней и задней, левой и правой детали разные номера."
      : missingAxis
        ? "Укажите ось: у передней и задней детали разные номера."
        : missingSide
          ? "Укажите сторону: у левой и правой детали разные номера."
          : null;
  const showAxis = !part || part.needsAxis || axis !== null;
  const showSide = !part || part.needsSide || side !== null;
  const oeInText = parsed.oe && parsed.oe !== oe.trim().toUpperCase() ? parsed.oe : null;

  function changeTitle(value: string) {
    setTitle(value);
    // A chosen part stays while the text still points to it; a new text gets a new suggestion.
    if (partChoice !== undefined) {
      const next = parseQuery(value);
      const keep = partChoice ? next.matches.some((m) => m.partType.id === partChoice) : next.matches[0]?.partType.id === parsed.matches[0]?.partType.id;
      if (!keep) setPartChoice(undefined);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!vehicleId) {
      setError("Выберите машину или «Без машины»");
      return;
    }
    const count = Number(qty);
    if (!Number.isInteger(count) || count < 1 || count > MAX_QTY) {
      setError(`Количество — от 1 до ${MAX_QTY}`);
      return;
    }
    setBusy(true);
    try {
      const { request } = await api<{ request: { id: string; number: number } }>("/api/requests", {
        body: {
          vehicleId: vehicleId === NO_VEHICLE ? null : vehicleId,
          title,
          description,
          partTypeId: part?.id ?? null,
          axis: axis ?? null,
          side: side ?? null,
          oe: oe.trim() || null,
          qty: count,
        },
      });
      takePendingPhotos();
      // The request exists now; a photo that fails to upload can be added again on the request page.
      for (const [i, file] of photos.entries()) {
        if (file.size > MAX_PHOTO_BYTES) continue;
        setProgress(`Загружаем фото ${i + 1} из ${photos.length}…`);
        const form = new FormData();
        form.append("file", file);
        try {
          await api(`/api/requests/${request.id}/attachments`, { body: form });
        } catch {
          // Shown as a missing photo on the next page, where the customer can add it again.
        }
      }
      router.push(`/requests/${request.id}?created=1`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setProgress(null);
    }
  }

  function dropPhotos() {
    takePendingPhotos();
    setPhotos([]);
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <Field
          label="Машина"
          htmlFor="vehicle"
          hint={
            <>
              {vehicles.length ? "Машины нет в списке? " : "В гараже пока нет машин. С VIN подбор точнее. "}
              <Link href="/garage/new" className="font-semibold text-ink underline">
                Добавить машину
              </Link>
            </>
          }
        >
          <Select id="vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
            {vehicleId === "" ? (
              <option value="" disabled>
                Выберите машину
              </option>
            ) : null}
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
            <option value={NO_VEHICLE}>Без машины</option>
          </Select>
        </Field>

        <div className="grid gap-3">
          <Field label="Что нужно" htmlFor="title">
            <Input
              id="title"
              value={title}
              onChange={(e) => changeTitle(e.target.value)}
              placeholder="Например: передняя левая фара"
              maxLength={160}
              autoComplete="off"
              aria-describedby="title-recognized"
              required
            />
          </Field>

          <div id="title-recognized" aria-live="polite" className="grid gap-2 text-sm">
            {part ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-soft px-3 py-2">
                <span className="text-muted">Деталь:</span>
                <span className="font-semibold">{part.ru}</span>
                <span className="zh text-muted" lang="zh-CN">
                  {zhLabel(part, axis ?? null, side ?? null)}
                </span>
                <button type="button" className="ml-auto font-semibold text-muted underline" onClick={() => setPartChoice(null)}>
                  Не то
                </button>
              </div>
            ) : title.trim().length >= 2 && !others.length ? (
              <p className="text-muted">Не узнали деталь. Ничего страшного: подборщик разберётся по описанию и фото.</p>
            ) : null}
            {others.length ? (
              <div className="grid gap-1.5">
                <span className="text-muted">{part ? "Или другая деталь:" : "Какая деталь нужна?"}</span>
                <div className="flex flex-wrap gap-2">
                  {others.map((p) => (
                    <Chip key={p.id} pressed={false} onClick={() => setPartChoice(p.id)}>
                      {p.ru}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
            {parsed.kind === "vin" ? (
              <p className="rounded-xl bg-warn-bg px-3 py-2 text-warn">
                Похоже, в тексте есть VIN. Его не нужно писать здесь: выберите машину из гаража.
              </p>
            ) : null}
            {oeInText ? (
              <p className="flex flex-wrap items-center gap-2 text-muted">
                В тексте есть номер <span className="font-mono text-ink">{oeInText}</span>
                <button type="button" className="font-semibold text-ink underline" onClick={() => setOe(oeInText)}>
                  Перенести в поле OE
                </button>
              </p>
            ) : null}
          </div>

          {showAxis ? (
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-sm font-semibold">Ось</legend>
              <div className="flex flex-wrap gap-2">
                {(["front", "rear"] as const).map((value) => (
                  <Chip key={value} pressed={axis === value} onClick={() => setAxisChoice(axis === value ? null : value)}>
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
                  <Chip key={value} pressed={side === value} onClick={() => setSideChoice(side === value ? null : value)}>
                    {SIDE_LABEL[value]}
                  </Chip>
                ))}
              </div>
            </fieldset>
          ) : null}
          {missingHint ? (
            <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn" role="status">
              {missingHint}
            </p>
          ) : null}
        </div>

        <Field label="Подробности" htmlFor="description" hint="Что случилось, особенности комплектации, что уже пробовали">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            rows={4}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field label="Номер OE, если знаете" htmlFor="oe" hint="Номер с детали или из каталога">
            <Input
              id="oe"
              value={oe}
              onChange={(e) => setOe(e.target.value.toUpperCase())}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono"
              placeholder="10273368-00"
            />
          </Field>
          <Field label="Количество" htmlFor="qty">
            <Input
              id="qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_QTY}
              step={1}
              value={qty}
              onChange={(e) => setQtyText(e.target.value)}
            />
          </Field>
        </div>

        {error ? (
          <p className="rounded-xl bg-bad-bg px-3 py-2 text-sm text-bad" role="alert">
            {error}
          </p>
        ) : null}
        {photos.length ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-soft px-3 py-2 text-sm" role="status">
            <span>
              Фото: {photos.length}. Приложим к заявке после отправки
            </span>
            <button type="button" className="ml-auto font-semibold text-muted underline" onClick={dropPhotos} disabled={busy}>
              Убрать
            </button>
          </div>
        ) : null}
        <div className="grid gap-2">
          <Button variant="primary" size="lg" disabled={busy || title.trim().length < 2}>
            {progress ?? (busy ? "Отправляем…" : "Отправить заявку")}
          </Button>
          <p className="text-sm text-muted">
            {photos.length ? "Ещё фото можно добавить на следующем шаге." : "Фото детали можно добавить на следующем шаге."}
          </p>
        </div>
      </form>
    </Card>
  );
}
