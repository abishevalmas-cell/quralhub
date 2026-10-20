import { Badge } from "@/components/ui/badge";
import { formatLeadTime } from "@/lib/pricing";
import type { CustomerOffer } from "@/lib/services/visibility";
import { cn, formatDateTime, formatKzt } from "@/lib/utils";
import { AcceptOfferButton } from "./accept-offer-button";
import { FITMENT, OFFER_KIND } from "./labels";

export function OfferCard({
  offer,
  canAccept,
  now,
}: {
  offer: CustomerOffer;
  canAccept: boolean;
  now: Date;
}) {
  const fit = FITMENT[offer.fitment];
  const expired = Boolean(offer.validUntil && new Date(offer.validUntil).getTime() < now.getTime());
  const accepted = offer.status === "accepted";
  const rejected = offer.status === "rejected";
  const details: [string, React.ReactNode][] = [];
  if (offer.manufacturer) details.push(["Производитель", offer.manufacturer]);
  if (offer.condition) details.push(["Состояние", offer.condition]);
  if (offer.oe) details.push(["Номер OE", <span key="oe" className="font-mono">{offer.oe}</span>]);
  if (offer.qty > 1) details.push(["Количество", `${offer.qty} шт.`]);
  details.push(["Срок", formatLeadTime(offer.leadDaysMin, offer.leadDaysMax)]);

  return (
    <article
      className={cn(
        "grid gap-4 rounded-2xl border bg-card p-4 sm:p-5",
        accepted ? "border-ok" : "border-line",
        rejected && "opacity-70",
      )}
      aria-label={offer.title}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-2">
          <h3 className="break-words text-[17px] font-bold leading-snug">{offer.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            <Badge>{OFFER_KIND[offer.kind] ?? offer.kind}</Badge>
            <Badge tone={fit.tone}>{fit.label}</Badge>
            {accepted ? <Badge tone="ok">Вы выбрали</Badge> : null}
            {rejected ? <Badge>Не выбрано</Badge> : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold tracking-tight">{formatKzt(offer.priceKzt)}</div>
          {offer.qty > 1 ? <div className="text-xs text-muted">за {offer.qty} шт.</div> : null}
        </div>
      </div>

      <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        {details.map(([k, v]) => (
          <div key={k} className="flex flex-wrap gap-x-2">
            <dt className="text-muted">{k}:</dt>
            <dd className="min-w-0 break-words font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-muted">{fit.hint}.</p>
      {offer.note ? <p className="whitespace-pre-line break-words rounded-xl bg-soft px-3 py-2 text-sm">{offer.note}</p> : null}

      {offer.status === "published" && canAccept ? (
        expired ? (
          <p className="text-sm text-warn">Срок предложения истёк. Напишите подборщику в чате, он обновит цену.</p>
        ) : (
          <div className="grid gap-1.5">
            <AcceptOfferButton offerId={offer.id} priceKzt={offer.priceKzt} />
            {offer.validUntil ? (
              <p className="text-xs text-muted">Цена действует до {formatDateTime(offer.validUntil)} по времени Астаны</p>
            ) : null}
          </div>
        )
      ) : null}
    </article>
  );
}
