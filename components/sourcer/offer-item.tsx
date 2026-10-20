import { Badge } from "@/components/ui/badge";
import type { StaffOffer } from "@/lib/services/sourcing";
import { cn, formatDateTime, formatKzt } from "@/lib/utils";
import { formatCny, formatDays } from "./format";
import { FITMENT_LABEL, OFFER_KIND_LABEL, OFFER_STATUS_LABEL } from "./labels";
import { OfferActions } from "./offer-actions";
import { Zh } from "./zh";

const isWebLink = (url: string | null): url is string => Boolean(url && /^https?:\/\//i.test(url));

// Staff view of one offer with its INTERNAL fields. Server component: only for the staff-only request page.
export function OfferItem({ offer, canEdit, editHref, now }: { offer: StaffOffer; canEdit: boolean; editHref: string; now: Date }) {
  const status = OFFER_STATUS_LABEL[offer.status];
  const kind = OFFER_KIND_LABEL[offer.kind];
  const fit = FITMENT_LABEL[offer.fitment];
  const expired = Boolean(offer.validUntil && new Date(offer.validUntil).getTime() <= now.getTime());
  const margin = offer.costKzt != null ? offer.priceKzt - offer.costKzt : null;
  const rows: [React.ReactNode, React.ReactNode][] = [];
  if (offer.oe) rows.push(["OE", <span key="oe" className="font-mono">{offer.oe}</span>]);
  if (offer.manufacturer) rows.push(["Производитель", offer.manufacturer]);
  if (offer.condition) rows.push(["Состояние", offer.condition]);
  rows.push(["Срок", formatDays(offer.leadDaysMin, offer.leadDaysMax)]);
  rows.push([<>Закупка <Zh>采购价</Zh></>, offer.priceCny ? `${formatCny(offer.priceCny)}${offer.qty > 1 ? " за 1 шт." : ""}` : "не указана"]);
  rows.push([<>Себестоимость <Zh>成本</Zh></>, offer.costKzt != null ? formatKzt(offer.costKzt) : "неизвестна"]);
  if (margin != null)
    rows.push([<>Маржа <Zh>利润</Zh></>, <span key="m" className={cn(margin < 0 && "font-bold text-bad")}>{formatKzt(margin)}</span>]);
  if (offer.supplierName || offer.supplierUrl)
    rows.push([
      <>Поставщик <Zh>供应商</Zh></>,
      isWebLink(offer.supplierUrl) ? (
        <a key="s" href={offer.supplierUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold underline">
          {offer.supplierName || "Ссылка на товар"}
        </a>
      ) : (
        offer.supplierName
      ),
    ]);
  if (offer.validUntil)
    rows.push([
      "Цена действует до",
      <span key="v" className={cn(expired && "font-semibold text-warn")}>
        {formatDateTime(offer.validUntil)}
        {expired ? " — истекла" : ""}
      </span>,
    ]);

  return (
    <article
      id={`offer-${offer.id}`}
      className={cn(
        "grid scroll-mt-24 gap-3 rounded-2xl border bg-card p-4",
        offer.status === "draft" ? "border-dashed border-muted/50" : offer.status === "accepted" ? "border-ok" : "border-line",
        (offer.status === "withdrawn" || offer.status === "rejected") && "opacity-70",
      )}
      aria-label={offer.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1.5">
          <h4 className="break-words font-bold leading-snug">{offer.title}</h4>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={status.tone}>
              {status.label} <Zh className="ml-1 font-normal">{status.zh}</Zh>
            </Badge>
            <Badge>
              {kind.label} <Zh className="ml-1 font-normal">{kind.zh}</Zh>
            </Badge>
            <Badge tone={fit.tone}>{fit.label}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold tracking-tight">{formatKzt(offer.priceKzt)}</div>
          {offer.qty > 1 ? <div className="text-xs text-muted">за {offer.qty} шт.</div> : null}
        </div>
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex flex-wrap gap-x-2">
            <dt className="text-muted">{k}:</dt>
            <dd className="min-w-0 break-words font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      {offer.note ? (
        <p className="whitespace-pre-line break-words rounded-xl bg-soft px-3 py-2 text-sm">
          <span className="font-semibold">Клиенту: </span>
          {offer.note}
        </p>
      ) : null}
      {offer.internalNote ? (
        <p className="whitespace-pre-line break-words rounded-xl border border-dashed border-hand/60 bg-hand-bg px-3 py-2 text-sm">
          <span className="font-semibold text-hand">
            Внутренняя заметка <Zh>内部</Zh>:{" "}
          </span>
          {offer.internalNote}
        </p>
      ) : null}
      {offer.status === "draft" && expired ? (
        <p className="text-sm text-warn">Цена устарела: откройте черновик, укажите вес и сохраните — цена пересчитается по текущему курсу.</p>
      ) : null}
      {offer.status === "published" && expired ? (
        <p className="text-sm text-warn">
          Срок цены истёк: клиент не может выбрать это предложение. Отзовите его и опубликуйте новое по текущему курсу.
        </p>
      ) : null}
      {canEdit ? <OfferActions offerId={offer.id} title={offer.title} status={offer.status} editHref={editHref} /> : null}
    </article>
  );
}
