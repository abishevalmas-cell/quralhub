"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { ApiError, api } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import { VIN_LENGTH, WMI_TABLE, validateVin, vinSummary } from "@/lib/vin";

type Mode = "vin" | "manual";
type Created = { vehicle: { id: string } };

// Must match INVALID_VIN in lib/services/vehicles.ts: "invalid_vin:<VIN>,<VIN>" carries suggested fixes.
const INVALID_VIN_PREFIX = "invalid_vin:";
const MIN_YEAR = 1980;

const MORE_BRANDS = ["Avatr", "Denza", "Dongfeng", "Exeed", "FAW", "Hongqi", "JAC", "Jaecoo", "Jetour", "Leapmotor", "Omoda", "Voyah", "Xpeng"];
const BRANDS = [...new Set([...Object.values(WMI_TABLE).flatMap((e) => e.brands), ...MORE_BRANDS])].sort((a, b) => a.localeCompare(b));

const TABS: { id: Mode; label: string }[] = [
  { id: "vin", label: "По VIN" },
  { id: "manual", label: "Без VIN" },
];

export function AddVehicleForm({ initialVin, initialMode, maxYear }: { initialVin: string; initialMode: Mode; maxYear: number }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  return (
    <Card>
      <div role="tablist" aria-label="Как добавить машину" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-soft p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={mode === tab.id}
            aria-controls={mode === tab.id ? `panel-${tab.id}` : undefined}
            onClick={() => setMode(tab.id)}
            className={cn(
              "h-10 rounded-lg text-sm font-semibold transition",
              mode === tab.id ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {mode === "vin" ? <VinPanel initialVin={initialVin} /> : <ManualPanel maxYear={maxYear} />}
    </Card>
  );
}

function VinPanel({ initialVin }: { initialVin: string }) {
  const router = useRouter();
  const [vin, setVin] = useState(initialVin);
  const [label, setLabel] = useState("");
  // Length errors are held back while the customer is still typing; other mistakes show at once.
  const [touched, setTouched] = useState(Boolean(initialVin));
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuggestions, setServerSuggestions] = useState<string[]>([]);

  const check = useMemo(() => validateVin(vin), [vin]);
  const length = [...check.vin].length;
  const typing = !touched && length < VIN_LENGTH && check.errors.every((e) => e.code === "length" || e.code === "empty");
  const errors = typing ? [] : check.errors;
  const suggestions = [...new Set([...check.suggestions, ...serverSuggestions])].filter((s) => s !== check.vin);
  const summary = length >= 3 && !check.errors.some((e) => e.code === "charset") ? vinSummary(check.vin) : null;

  function change(next: string) {
    setVin(next);
    setServerError(null);
    setServerSuggestions([]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!check.ok) return;
    setBusy(true);
    setServerError(null);
    try {
      const result = await api<Created>("/api/vehicles", { body: { vin: check.vin, label: label.trim() || undefined } });
      router.push(`/garage/${result.vehicle.id}`);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : undefined;
      setServerSuggestions(code?.startsWith(INVALID_VIN_PREFIX) ? code.slice(INVALID_VIN_PREFIX.length).split(",").filter(Boolean) : []);
      setServerError((error as Error).message);
      setBusy(false);
    }
  }

  return (
    <form id="panel-vin" role="tabpanel" aria-labelledby="tab-vin" onSubmit={submit} className="grid gap-4" noValidate>
      <p className="text-sm text-muted">
        VIN есть в техпаспорте, под лобовым стеклом и на табличке в проёме водительской двери. Расшифруем его и откроем каталог именно
        вашей машины.
      </p>
      <div className="grid gap-1.5">
        <label htmlFor="vin" className="text-sm font-semibold">
          VIN
        </label>
        <Input
          id="vin"
          value={vin}
          onChange={(e) => change(e.target.value)}
          onBlur={() => vin.trim() && setTouched(true)}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={40}
          placeholder="17 символов"
          aria-invalid={errors.length > 0 || Boolean(serverError)}
          aria-describedby="vin-status"
          className="font-mono text-lg uppercase tracking-wider"
          autoFocus={!initialVin}
        />
        <div id="vin-status" aria-live="polite" className="grid gap-1.5 text-sm">
          <p className="text-muted">
            <span className="font-mono">{length}</span> из {VIN_LENGTH}
            {summary ? ` · ${summary}` : ""}
          </p>
          {errors.map((e) => (
            <p key={e.code} className="text-bad">
              {e.message}
            </p>
          ))}
          {check.warnings.map((w) => (
            <p key={w.code} className="text-warn">
              {w.message}
            </p>
          ))}
          {serverError && !errors.length ? <p className="text-bad">{serverError}</p> : null}
        </div>
        {suggestions.length ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Исправить на</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  change(s);
                  setTouched(true);
                }}
                className="rounded-lg bg-soft px-2.5 py-1.5 font-mono font-semibold hover:bg-line"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <Field label="Название, если хотите" htmlFor="vin-label" hint="Например, «Машина жены». Видно только вам">
        <Input id="vin-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} autoComplete="off" />
      </Field>
      <Button variant="primary" size="lg" disabled={busy}>
        {busy ? "Расшифровываем…" : "Добавить по VIN"}
      </Button>
    </form>
  );
}

function ManualPanel({ maxYear }: { maxYear: number }) {
  const router = useRouter();
  const [form, setForm] = useState({ brand: "", model: "", year: "", trim: "", label: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const years = Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, i) => maxYear - i);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.brand.trim() || !form.model.trim() || !form.year) {
      setError("Укажите марку, модель и год выпуска");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api<Created>("/api/vehicles", {
        body: {
          manual: { brand: form.brand, model: form.model, year: Number(form.year), trim: form.trim.trim() || null },
          label: form.label.trim() || undefined,
        },
      });
      router.push(`/garage/${result.vehicle.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form id="panel-manual" role="tabpanel" aria-labelledby="tab-manual" onSubmit={submit} className="grid gap-4" noValidate>
      <p className="text-sm text-muted">
        Без VIN каталог не откроется. Подборщик проверит совместимость по марке, модели, году и фото детали.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Марка" htmlFor="manual-brand">
          <Input id="manual-brand" list="manual-brands" value={form.brand} onChange={set("brand")} maxLength={60} autoComplete="off" required />
          <datalist id="manual-brands">
            {BRANDS.map((brand) => (
              <option key={brand} value={brand} />
            ))}
          </datalist>
        </Field>
        <Field label="Модель" htmlFor="manual-model">
          <Input id="manual-model" value={form.model} onChange={set("model")} maxLength={80} autoComplete="off" placeholder="Song Plus" required />
        </Field>
        <Field label="Год выпуска" htmlFor="manual-year">
          <Select id="manual-year" value={form.year} onChange={set("year")} required>
            <option value="">Выберите год</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Комплектация, если знаете" htmlFor="manual-trim">
          <Input id="manual-trim" value={form.trim} onChange={set("trim")} maxLength={160} autoComplete="off" />
        </Field>
      </div>
      <Field label="Название, если хотите" htmlFor="manual-label" hint="Видно только вам">
        <Input id="manual-label" value={form.label} onChange={set("label")} maxLength={60} autoComplete="off" />
      </Field>
      {error ? (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      ) : null}
      <Button variant="primary" size="lg" disabled={busy}>
        {busy ? "Добавляем…" : "Добавить без VIN"}
      </Button>
    </form>
  );
}
