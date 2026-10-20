"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import type { PricingSettings } from "@/lib/pricing";
// Straight from the pure modules: the lib/pricing index also re-exports the settings store, which would pull
// the database schema into the browser bundle.
import { groupThousands } from "@/lib/pricing/decimal";
import { ROUND_TO_OPTIONS } from "@/lib/pricing/fields";
import { computeQuote, type Quote } from "@/lib/pricing/quote";
import { cn, pluralRu } from "@/lib/utils";
import {
  daysBetween,
  nextDay,
  toNumber,
  toPricingBody,
  toPricingForm,
  type PricingFormValues,
  type PricingKey,
} from "./pricing-values";

type Key = PricingKey;
type Form = PricingFormValues;

// The rate moves daily; a rate older than this is worth a warning, not a block.
const STALE_AFTER_DAYS = 3;

const kzt = (n: number) => `${groupThousands(n)} ₸`;

type NumberField = { key: Exclude<Key, "cnyRateDate" | "roundTo">; label: string; hint?: string; decimal: boolean };

const GROUPS: { title: string; fields: NumberField[] }[] = [
  {
    title: "Наценка",
    fields: [
      { key: "markupPct", label: "Наценка, %", hint: "К себестоимости: товар, доставка и пошлина", decimal: true },
      { key: "minMarginKzt", label: "Минимальная маржа, ₸", hint: "Если процент даёт меньше, берём эту сумму", decimal: false },
    ],
  },
  {
    title: "Доставка и пошлина",
    fields: [
      { key: "perKgKzt", label: "Карго, ₸ за кг", hint: "Из Китая до Казахстана, за кг веса детали", decimal: false },
      { key: "localChinaKzt", label: "Доставка по Китаю, ₸", hint: "От продавца до склада карго, за позицию", decimal: false },
      { key: "dutyPct", label: "Пошлина, %", hint: "От стоимости товара в тенге", decimal: true },
    ],
  },
];

export function PricingForm({ initial, today }: { initial: PricingSettings; today: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState<Form>(() => toPricingForm(initial));
  const [form, setForm] = useState<Form>(saved);
  const [exampleCny, setExampleCny] = useState("500");
  const [exampleKg, setExampleKg] = useState("1,5");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = (Object.keys(form) as Key[]).some((key) => form[key] !== saved[key]);
  const set = (key: Key) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: e.target.value });
    setMessage(null);
  };

  const example = useMemo((): { quote: Quote } | { error: string } => {
    const s = toPricingBody(form);
    try {
      return {
        quote: computeQuote({
          priceCny: exampleCny.trim(),
          qty: 1,
          weightKg: toNumber(exampleKg),
          cnyRate: s.cnyRate,
          perKgKzt: s.perKgKzt,
          localChinaKzt: s.localChinaKzt,
          dutyPct: s.dutyPct,
          markupPct: s.markupPct,
          roundTo: s.roundTo,
          minMarginKzt: s.minMarginKzt,
        }),
      };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [form, exampleCny, exampleKg]);

  const rateAge = daysBetween(form.cnyRateDate, today);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { pricing } = await api<{ pricing: PricingSettings }>("/api/admin/pricing", { method: "PUT", body: toPricingBody(form) });
      const next = toPricingForm(pricing);
      setSaved(next);
      setForm(next);
      setMessage({ ok: true, text: "Сохранено. Новые цены считаются по этим значениям" });
      router.refresh();
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
      <div className="grid gap-4">
        <Card className="grid gap-4 p-4 sm:p-5">
          <fieldset className="grid gap-4">
            <legend className="mb-1 font-bold">Курс юаня</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Курс, ₸ за 1 ¥" htmlFor="pricing-cnyRate" hint="Официальный курс Национального банка РК">
                <Input
                  id="pricing-cnyRate"
                  inputMode="decimal"
                  autoComplete="off"
                  value={form.cnyRate}
                  onChange={set("cnyRate")}
                  className="tabular-nums"
                  required
                />
              </Field>
              <Field
                label="Дата курса"
                htmlFor="pricing-cnyRateDate"
                hint={
                  rateAge !== null && rateAge > STALE_AFTER_DAYS ? (
                    <span className="text-warn">
                      Курсу {rateAge} {pluralRu(rateAge, "день", "дня", "дней")}. Обновите курс и дату по данным Нацбанка
                    </span>
                  ) : (
                    "Дата, на которую Нацбанк установил этот курс"
                  )
                }
              >
                <Input
                  id="pricing-cnyRateDate"
                  type="date"
                  max={nextDay(today)}
                  value={form.cnyRateDate}
                  onChange={set("cnyRateDate")}
                  required
                />
              </Field>
            </div>
          </fieldset>
        </Card>

        {GROUPS.map((group) => (
          <Card key={group.title} className="p-4 sm:p-5">
            <fieldset className="grid gap-4">
              <legend className="mb-1 font-bold">{group.title}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.fields.map((field) => (
                  <Field key={field.key} label={field.label} htmlFor={`pricing-${field.key}`} hint={field.hint}>
                    <Input
                      id={`pricing-${field.key}`}
                      inputMode={field.decimal ? "decimal" : "numeric"}
                      autoComplete="off"
                      value={form[field.key]}
                      onChange={set(field.key)}
                      className="tabular-nums"
                      required
                    />
                  </Field>
                ))}
              </div>
            </fieldset>
          </Card>
        ))}

        <Card className="p-4 sm:p-5">
          <Field label="Округление цены для клиента" htmlFor="pricing-roundTo" hint="Цена всегда округляется вверх">
            <Select id="pricing-roundTo" value={form.roundTo} onChange={set("roundTo")}>
              {ROUND_TO_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>
                  до {kzt(n)}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      </div>

      <div className="grid gap-4 lg:sticky lg:top-24">
        <Card className="grid gap-4 p-4 sm:p-5">
          <h3 className="font-bold">
            Пример расчёта
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Цена в Китае, ¥" htmlFor="pricing-example-cny">
              <Input id="pricing-example-cny" inputMode="decimal" autoComplete="off" value={exampleCny} onChange={(e) => setExampleCny(e.target.value)} className="tabular-nums" />
            </Field>
            <Field label="Вес детали, кг" htmlFor="pricing-example-kg">
              <Input id="pricing-example-kg" inputMode="decimal" autoComplete="off" value={exampleKg} onChange={(e) => setExampleKg(e.target.value)} className="tabular-nums" />
            </Field>
          </div>
          <div aria-live="polite">
            {"quote" in example ? (
              <div className="grid gap-3">
                <dl className="grid text-sm">
                  {example.quote.breakdown.map((line) => (
                    <div key={line.label} className="flex justify-between gap-3 border-b border-dashed border-line py-1.5 last:border-0">
                      <dt className="min-w-0 text-muted">{line.label}</dt>
                      <dd className="shrink-0 tabular-nums">{kzt(line.kzt)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="rounded-xl bg-soft px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold">Цена для клиента</span>
                    <span className="text-xl font-extrabold tabular-nums">{kzt(example.quote.priceKzt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    Себестоимость {kzt(example.quote.costKzt)} · маржа {kzt(example.quote.marginKzt)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-warn-bg px-3 py-2.5 text-sm text-warn">Пример не посчитан: {example.error}</p>
            )}
          </div>
          <p className="text-sm text-muted">Расчёт только для проверки. Ничего не сохраняется, клиенты его не видят.</p>
        </Card>

        <Card className="grid gap-3 p-4 sm:p-5">
          <p className="text-sm text-muted">
            Цены в уже отправленных предложениях не меняются. Новые значения применяются, когда подборщик считает новое предложение.
          </p>
          {message ? (
            <p className={cn("text-sm", message.ok ? "text-ok" : "text-bad")} role={message.ok ? "status" : "alert"}>
              {message.text}
            </p>
          ) : dirty ? (
            <p className="text-sm text-warn" role="status">
              Есть несохранённые изменения
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" disabled={busy || !dirty}>
              {busy ? "Сохраняем…" : "Сохранить цены"}
            </Button>
            {dirty ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => { setForm(saved); setMessage(null); }}>
                Отменить изменения
              </Button>
            ) : null}
          </div>
        </Card>
      </div>
    </form>
  );
}
