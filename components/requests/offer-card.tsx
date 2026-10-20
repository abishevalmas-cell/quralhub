import { Badge } from "@/components/ui/badge";
import { Icon, type IconName } from "@/components/ui/icon";
import type { OfferKind } from "@/lib/db/schema";
import { formatLeadTime } from "@/lib/pricing";
import type { CustomerOffer } from "@/lib/services/visibility";
import { cn, formatDateTime, formatKzt } from "@/lib/utils";
import { AcceptOfferButton } from "./accept-offer-button";
import { FITMENT, OFFER_KIND } from "./labels";

const KIND_ICON: Record<OfferKind, IconName> = { original: "shield", oem: "box", aftermarket: "wrench", used: "key" };

// One variant from the sourcer, built like the part cards of the home page: what it is with its tags, the facts,
// the price and a graphite "Выбрать" at the bottom. Only CustomerOffer fields: nothing internal can get here.
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
  const choosable = offer.status === "published" && canAccept;
  const details: [string, React.ReactNode][] = [];
  if (offer.manufacturer) details.push(["Производитель", offer.manufacturer]);
  if (offer.condition) details.push(["Состояние", offer.condition]);
  if (offer.oe) details.push(["Номер OE", <span key="oe" className="font-mono text-[13px]">{offer.oe}</span>]);
  if (offer.qty > 1) details.push(["Количество", `${offer.qty} шт.`]);
  details.push(["Срок", formatLeadTime(offer.leadDaysMin, offer.leadDaysMax)]);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[18px] border bg-card",
        accepted ? "border-ink shadow-[0_0_0_1px_var(--ink)]" : "border-line",
        rejected && "opacity-70",
      )}
      aria-label={offer.title}
    >
      <div className="grid gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-soft text-ink">
            <Icon name={KIND_ICON[offer.kind] ?? "box"} className="size-5" />
          </span>
          <div className="grid min-w-0 flex-[1_1_12rem] gap-2">
            <h3 className="break-words text-[17px] font-bold leading-snug">{offer.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              <Badge>{OFFER_KIND[offer.kind] ?? offer.kind}</Badge>
              <Badge tone={fit.tone}>{fit.label}</Badge>
              {accepted ? (
                <Badge tone="lime">
                  <Icon name="check" strokeWidth={2.4} className="size-3" />
                  Вы выбрали
                </Badge>
              ) : null}
              {rejected ? <Badge>Не выбрано</Badge> : null}
            </div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[24px] font-bold leading-tight tracking-[-0.03em]">{formatKzt(offer.priceKzt)}</div>
            <div className="text-xs text-muted">{offer.qty > 1 ? `за ${offer.qty} шт., с доставкой из Китая` : "деталь и доставка из Китая"}</div>
          </div>
        </div>

        <dl className="grid gap-x-5 gap-y-1.5 text-sm sm:grid-cols-2">
          {details.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-baseline gap-x-2">
              <dt className="text-muted">{k}:</dt>
              <dd className="min-w-0 break-words font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="flex items-start gap-2 text-sm text-muted">
          <Icon name="info" className="mt-0.5 size-4 shrink-0" />
          <span>{fit.hint}.</span>
        </p>
        {offer.note ? (
          <p className="whitespace-pre-line break-words rounded-[12px] bg-soft px-3.5 py-2.5 text-sm">{offer.note}</p>
        ) : null}
      </div>

      {choosable ? (
        <div className="border-t border-line bg-soft/50 px-4 py-3 sm:px-5">
          {expired ? (
            <p className="text-sm text-warn">Срок предложения истёк. Напишите подборщику в чате, он обновит цену.</p>
          ) : (
            <div className="grid gap-1.5">
              <AcceptOfferButton offerId={offer.id} priceKzt={offer.priceKzt} />
              {offer.validUntil ? (
                <p className="text-xs text-muted">Цена действует до {formatDateTime(offer.validUntil)} по времени Астаны</p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
