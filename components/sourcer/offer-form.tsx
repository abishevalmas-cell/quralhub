"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { api } from "@/lib/client/api";
import type { FitmentLevel, OfferKind } from "@/lib/db/schema";
import type { QuotePreview, StaffOffer } from "@/lib/services/sourcing";
import { cn, formatKzt } from "@/lib/utils";
import { ActionError } from "./action-error";
import { FITMENT_LABEL, OFFER_KIND_LABEL } from "./labels";
import { useStaffAction } from "./use-staff-action";
import { Zh } from "./zh";

type Form = {
  title: string;
  oe: string;
  manufacturer: string;
  kind: OfferKind;
  condition: string;
  qty: string;
  priceCny: string;
  weightKg: string;
  priceKzt: string;
  leadDaysMin: string;
  leadDaysMax: string;
  fitment: FitmentLevel;
  note: string;
  supplierName: string;
  supplierUrl: string;
  internalNote: string;
  validDays: string;
  forceBelowCost: boolean;
};

const KINDS = Object.keys(OFFER_KIND_LABEL) as OfferKind[];
const FITMENTS = Object.keys(FITMENT_LABEL) as FitmentLevel[];
const PREVIEW_DELAY_MS = 400;

function initialForm(offer: StaffOffer | undefined, defaults: { title: string; oe: string; qty: number }): Form {
  return {
    title: offer?.title ?? defaults.title,
    oe: offer ? (offer.oe ?? "") : defaults.oe,
    manufacturer: offer?.manufacturer ?? "",
    kind: offer?.kind ?? "original",
    condition: offer?.condition ?? "",
    qty: String(offer?.qty ?? defaults.qty),
    priceCny: offer?.priceCny ?? "",
    // offers keep no weight: it is asked again when the price has to be recomputed.
    weightKg: "",
    priceKzt: offer ? String(offer.priceKzt) : "",
    leadDaysMin: offer ? String(offer.leadDaysMin) : "",
    leadDaysMax: offer ? String(offer.leadDaysMax) : "",
    // Never preselect "fits by VIN": the sourcer confirms it.
    fitment: offer?.fitment ?? "needs_check",
    note: offer?.note ?? "",
    supplierName: offer?.supplierName ?? "",
    supplierUrl: offer?.supplierUrl ?? "",
    internalNote: offer?.internalNote ?? "",
    validDays: "2",
    forceBelowCost: false,
  };
}

// "1 234,5" → "1234.50", the stored form; null when it is not a yuan amount.
function canonicalCny(value: string): string | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.replace(/\s/g, ""));
  if (!match) return null;
  return `${match[1].replace(/^0+(?=\d)/, "")}.${(match[2] ?? "").padEnd(2, "0")}`;
}

// Whole tenge, spaces allowed: "24 500". undefined when empty, NaN when it is not a number.
function parseTenge(value: string): number | undefined {
  const text = value.replace(/\s/g, "");
  if (!text) return undefined;
  return /^\d{1,10}$/.test(text) ? Number(text) : NaN;
}

const toInt = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null);
const formatRate = (n: number) => String(n).replace(".", ",");
const formatIsoDate = (iso: string) => iso.split("-").reverse().join(".");

type Preview = { key: string; quote?: QuotePreview; error?: string };

export function OfferForm({
  requestId,
  offer,
  defaults,
  vinConfirmable,
  doneHref,
}: {
  requestId: string;
  offer?: StaffOffer;
  defaults: { title: string; oe: string; qty: number };
  vinConfirmable: boolean;
  doneHref: string;
}) {
  const router = useRouter();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const [form, setForm] = useState<Form>(() => initialForm(offer, defaults));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const seq = useRef(0);
  const { busy, error, run, refresh } = useStaffAction();
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const priceCny = form.priceCny.trim();
  const weightKg = form.weightKg.trim();
  const qty = toInt(form.qty);
  const previewKey = priceCny && weightKg && qty && qty >= 1 ? `${priceCny}|${weightKg}|${qty}` : null;

  // Debounced: the server computes with the current pricing settings, the same way the saved offer will be priced.
  useEffect(() => {
    if (!previewKey || !qty) return;
    const current = ++seq.current;
    const timer = setTimeout(() => {
      api<{ quote: QuotePreview }>("/api/sourcer/quote", { body: { priceCny, qty, weightKg } })
        .then(({ quote }) => {
          if (current === seq.current) setPreview({ key: previewKey, quote });
        })
        .catch((e: Error) => {
          if (current === seq.current) setPreview({ key: previewKey, error: e.message });
        });
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [previewKey, priceCny, weightKg, qty]);

  const shown = previewKey && preview?.key === previewKey ? preview : null;
  const quote = shown?.quote ?? null;
  // Editing without a weight keeps the saved cost while the yuan price and quantity are unchanged and the saved
  // calculation is still current (the server decides: price not expired, pricing settings unchanged since).
  const keepsSaved = Boolean(
    offer &&
      !weightKg &&
      offer.priceCny &&
      offer.costReusable &&
      canonicalCny(priceCny) === offer.priceCny &&
      qty === offer.qty &&
      offer.costKzt != null,
  );
  const cost = quote?.costKzt ?? (keepsSaved ? offer!.costKzt : null);
  const own = parseTenge(form.priceKzt);
  const ownValid = own !== undefined && Number.isFinite(own) && own > 0;
  const finalPrice = ownValid ? own : (quote?.priceKzt ?? (keepsSaved ? offer!.priceKzt : null));
  const margin = cost != null && finalPrice != null ? finalPrice - cost : null;
  const belowCost = margin != null && margin < 0;
  const needsWeight = Boolean(priceCny) && !weightKg && !keepsSaved;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLocalError(null);
    if (own !== undefined && !ownValid) {
      setLocalError("Цена для клиента — целое число тенге, например 24 500");
      return;
    }
    const body = {
      title: form.title,
      oe: form.oe.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      kind: form.kind,
      condition: form.condition.trim() || null,
      qty: qty ?? null,
      priceCny: priceCny || null,
      weightKg: weightKg || null,
      priceKzt: ownValid ? own : null,
      leadDaysMin: toInt(form.leadDaysMin),
      leadDaysMax: toInt(form.leadDaysMax),
      fitment: form.fitment,
      note: form.note.trim() || null,
      supplierName: form.supplierName.trim() || null,
      supplierUrl: form.supplierUrl.trim() || null,
      internalNote: form.internalNote.trim() || null,
      validDays: toInt(form.validDays),
      forceBelowCost: form.forceBelowCost,
    };
    await run(
      "save",
      () =>
        offer
          ? api(`/api/sourcer/offers/${offer.id}`, { method: "PATCH", body })
          : api(`/api/sourcer/requests/${requestId}/offers`, { body }),
      () => {
        router.replace(doneHref, { scroll: false });
        router.refresh();
      },
    );
  }

  const showForce = belowCost || error?.code === "below_cost";

  return (
    <form
      id="offer-form"
      onSubmit={save}
      className="grid scroll-mt-24 gap-4 rounded-[18px] border border-ink/30 bg-card p-4 shadow-[0_8px_30px_rgb(23_35_44/0.06)] sm:p-5"
      aria-label={offer ? `Черновик «${offer.title}»` : "Новое предложение"}
    >
      <h4 className="font-bold">
        {offer ? "Черновик" : "Новое предложение"} <Zh className="font-normal text-muted">{offer ? "编辑草稿" : "新报价"}</Zh>
      </h4>

      <Field label={<>Название для клиента <Zh className="font-normal text-muted">名称</Zh></>} htmlFor={id("title")}>
        <Input id={id("title")} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={160} required />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={<>Номер OE <Zh className="font-normal text-muted">零件号</Zh></>} htmlFor={id("oe")}>
          <Input id={id("oe")} value={form.oe} onChange={(e) => set("oe", e.target.value)} maxLength={40} className="font-mono" autoCapitalize="characters" />
        </Field>
        <Field label={<>Производитель <Zh className="font-normal text-muted">品牌</Zh></>} htmlFor={id("manufacturer")}>
          <Input id={id("manufacturer")} value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} maxLength={80} placeholder="BYD, Bosch, TRW" />
        </Field>
        <Field label={<>Тип <Zh className="font-normal text-muted">类型</Zh></>} htmlFor={id("kind")}>
          <Select id={id("kind")} value={form.kind} onChange={(e) => set("kind", e.target.value as OfferKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {OFFER_KIND_LABEL[k].label} · {OFFER_KIND_LABEL[k].zh}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={<>Состояние <Zh className="font-normal text-muted">成色</Zh></>} htmlFor={id("condition")} hint="Для б/у: пробег, дефекты">
          <Input id={id("condition")} value={form.condition} onChange={(e) => set("condition", e.target.value)} maxLength={80} placeholder="Новая" />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={<>Количество <Zh className="font-normal text-muted">数量</Zh></>} htmlFor={id("qty")}>
          <Input id={id("qty")} type="number" inputMode="numeric" min={1} max={50} value={form.qty} onChange={(e) => set("qty", e.target.value)} required />
        </Field>
        <Field label={<>Цена в Китае, ¥ <Zh className="font-normal text-muted">采购价</Zh></>} htmlFor={id("priceCny")} hint="За 1 шт.">
          <Input id={id("priceCny")} inputMode="decimal" value={form.priceCny} onChange={(e) => set("priceCny", e.target.value)} placeholder="120,50" />
        </Field>
        <Field
          label={<>Вес 1 шт., кг <Zh className="font-normal text-muted">重量</Zh></>}
          htmlFor={id("weightKg")}
          hint={
            offer && offer.priceCny
              ? offer.costReusable
                ? "Вес не хранится: укажите, чтобы пересчитать"
                : "Сохранённый расчёт устарел: укажите вес, чтобы пересчитать по текущему курсу"
              : undefined
          }
          error={needsWeight ? "Без веса не посчитать доставку" : undefined}
        >
          <Input id={id("weightKg")} inputMode="decimal" value={form.weightKg} onChange={(e) => set("weightKg", e.target.value)} placeholder="1,5" />
        </Field>
      </div>

      <section aria-live="polite" aria-label="Расчёт цены" className="grid gap-2 rounded-xl bg-soft p-3 text-sm">
        <h5 className="font-bold">
          Расчёт цены <Zh className="font-normal text-muted">报价</Zh>
        </h5>
        {!previewKey ? (
          keepsSaved && cost != null ? (
            <p className="text-muted">Себестоимость {formatKzt(cost)} — из сохранённого расчёта. Чтобы пересчитать по текущему курсу, укажите вес.</p>
          ) : (
            <p className="text-muted">Укажите цену в юанях, количество и вес — посчитаем доставку, пошлину и цену для клиента.</p>
          )
        ) : !shown ? (
          <p className="text-muted">Считаем…</p>
        ) : shown.error ? (
          <p className="text-bad">{shown.error}</p>
        ) : quote ? (
          <>
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 tabular-nums">
              <dt>Закупка <Zh className="text-muted">采购</Zh></dt>
              <dd className="text-right">{formatKzt(quote.purchaseKzt)}</dd>
              <dt>Доставка <Zh className="text-muted">运费</Zh></dt>
              <dd className="text-right">{formatKzt(quote.shippingKzt)}</dd>
              <dt>Пошлина <Zh className="text-muted">关税</Zh></dt>
              <dd className="text-right">{formatKzt(quote.dutyKzt)}</dd>
              <dt className="font-semibold">Себестоимость <Zh className="font-normal text-muted">成本</Zh></dt>
              <dd className="text-right font-semibold">{formatKzt(quote.costKzt)}</dd>
              <dt className="font-semibold">Цена по расчёту <Zh className="font-normal text-muted">售价</Zh></dt>
              <dd className="text-right font-bold">{formatKzt(quote.priceKzt)}</dd>
              <dt>Маржа <Zh className="text-muted">利润</Zh></dt>
              <dd className="text-right">{formatKzt(quote.marginKzt)}</dd>
            </dl>
            <p className="text-xs text-muted">
              Курс {formatRate(quote.cnyRate)} ₸ за 1 ¥ на {formatIsoDate(quote.cnyRateDate)}
              {quote.unitPriceKzt !== quote.priceKzt ? ` · ≈ ${formatKzt(quote.unitPriceKzt)} за 1 шт.` : ""}
            </p>
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-semibold">Из чего складывается</summary>
              <ul className="mt-1 grid gap-0.5">
                {quote.breakdown.map((line, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{line.label}</span>
                    <span className="tabular-nums">{formatKzt(line.kzt)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : null}
        {ownValid && quote && own !== quote.priceKzt ? (
          <p>
            Сохранится ваша цена {formatKzt(own)}
            {margin != null ? `, маржа ${formatKzt(margin)}` : ""}.{" "}
            <button type="button" className="font-semibold underline" onClick={() => set("priceKzt", String(quote.priceKzt))}>
              Подставить расчётную
            </button>
          </p>
        ) : null}
        {belowCost ? <p className="font-semibold text-bad">Цена ниже себестоимости на {formatKzt(-(margin ?? 0))}.</p> : null}
      </section>

      <Field
        label={<>Цена для клиента, ₸ <Zh className="font-normal text-muted">售价</Zh></>}
        htmlFor={id("priceKzt")}
        hint={quote ? "Пусто — возьмём цену по расчёту" : "За всё количество. Без цены в юанях её нужно указать"}
        error={own !== undefined && !ownValid ? "Целое число тенге, например 24 500" : undefined}
      >
        <Input
          id={id("priceKzt")}
          inputMode="numeric"
          value={form.priceKzt}
          onChange={(e) => set("priceKzt", e.target.value)}
          placeholder={quote ? String(quote.priceKzt) : "24 500"}
        />
      </Field>
      {showForce ? (
        <label htmlFor={id("force")} className="flex items-start gap-3 rounded-xl border border-bad/40 bg-bad-bg px-3 py-2.5 text-sm text-bad">
          <input id={id("force")} type="checkbox" checked={form.forceBelowCost} onChange={(e) => set("forceBelowCost", e.target.checked)} className="mt-0.5" />
          <span className="font-semibold">Продать ниже себестоимости — я понимаю, что заказ будет в убыток</span>
        </label>
      ) : null}

      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-sm font-semibold">
          Срок до города клиента, дней <Zh className="font-normal text-muted">交期</Zh>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="От" htmlFor={id("leadMin")}>
            <Input id={id("leadMin")} type="number" inputMode="numeric" min={1} max={180} value={form.leadDaysMin} onChange={(e) => set("leadDaysMin", e.target.value)} placeholder="12" required />
          </Field>
          <Field label="До" htmlFor={id("leadMax")}>
            <Input id={id("leadMax")} type="number" inputMode="numeric" min={1} max={180} value={form.leadDaysMax} onChange={(e) => set("leadDaysMax", e.target.value)} placeholder="18" required />
          </Field>
        </div>
      </fieldset>

      <Field
        label={<>Совместимость <Zh className="font-normal text-muted">适配</Zh></>}
        htmlFor={id("fitment")}
        hint={vinConfirmable ? FITMENT_LABEL[form.fitment].hint : "«Подходит по VIN» недоступно: VIN не расшифрован, комплектация неизвестна или каталог по VIN не открывается"}
      >
        <Select id={id("fitment")} value={form.fitment} onChange={(e) => set("fitment", e.target.value as FitmentLevel)}>
          {FITMENTS.map((f) => (
            <option key={f} value={f} disabled={f === "vin_confirmed" && !vinConfirmable}>
              {FITMENT_LABEL[f].label} · {FITMENT_LABEL[f].zh}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={<>Комментарий для клиента <Zh className="font-normal text-muted">客户可见</Zh></>} htmlFor={id("note")} hint="Клиент увидит его в предложении">
        <Textarea id={id("note")} value={form.note} onChange={(e) => set("note", e.target.value)} maxLength={1000} rows={2} placeholder="Например: оригинал с дилерского склада, с датчиком износа" />
      </Field>

      <div className="grid gap-3 rounded-xl border border-dashed border-hand/60 bg-hand-bg p-3">
        <p className="text-sm font-bold text-hand">
          Только для нас <Zh className="font-normal">内部</Zh> — клиент этого не увидит
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={<>Поставщик <Zh className="font-normal text-muted">供应商</Zh></>} htmlFor={id("supplier")}>
            <Input id={id("supplier")} value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)} maxLength={120} />
          </Field>
          <Field label={<>Ссылка на товар <Zh className="font-normal text-muted">链接</Zh></>} htmlFor={id("url")}>
            <Input id={id("url")} type="url" inputMode="url" value={form.supplierUrl} onChange={(e) => set("supplierUrl", e.target.value)} maxLength={500} placeholder="https://" />
          </Field>
        </div>
        <Field label={<>Внутренняя заметка <Zh className="font-normal text-muted">内部备注</Zh></>} htmlFor={id("internal")}>
          <Textarea id={id("internal")} value={form.internalNote} onChange={(e) => set("internalNote", e.target.value)} maxLength={2000} rows={2} />
        </Field>
      </div>

      <Field
        label={<>Цена действует, дней <Zh className="whitespace-nowrap font-normal text-muted">有效期</Zh></>}
        htmlFor={id("validDays")}
        hint="Курс юаня меняется: по умолчанию 2 дня, отсчёт с момента сохранения"
        className="max-w-64"
      >
        <Input id={id("validDays")} type="number" inputMode="numeric" min={1} max={14} value={form.validDays} onChange={(e) => set("validDays", e.target.value)} required />
      </Field>

      {localError ? (
        <p role="alert" className="text-sm text-bad">
          {localError}
        </p>
      ) : null}
      <ActionError error={error} onRefresh={refresh} />
      <div className={cn("flex flex-wrap gap-2")}>
        <Button disabled={busy !== null}>{busy ? "Сохраняем…" : <>Сохранить черновик <Zh className="font-normal">保存草稿</Zh></>}</Button>
        <ButtonLink href={doneHref} variant="ghost" scroll={false}>
          Отмена
        </ButtonLink>
      </div>
    </form>
  );
}
