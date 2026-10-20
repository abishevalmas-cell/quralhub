import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FittedPart } from "@/lib/services/catalog";
import { requestHref } from "./catalog-links";
import { CopyButton } from "./copy-button";
import { FitmentBadge } from "./fitment-badge";

function Detail({ label, value }: { label: string; value: string }) {
  return value ? (
    <div className="flex gap-1">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  ) : null;
}

export function PartList({ vehicleId, parts }: { vehicleId: string; parts: FittedPart[] }) {
  // Diagrams belong to the group, so the same picture usually repeats on every row.
  const diagrams = [...new Set(parts.map((p) => p.diagram).filter((d): d is string => Boolean(d)))].slice(0, 4);
  return (
    <div className="grid gap-4">
      {diagrams.length ? (
        <figure className="grid gap-2">
          {diagrams.map((src) => (
            <div key={src} className="overflow-hidden rounded-2xl border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element -- catalog diagrams come from images.17vin.com as is */}
              <img src={src} alt="Схема группы из каталога" referrerPolicy="no-referrer" loading="lazy" className="mx-auto max-h-[70vh] w-auto" />
            </div>
          ))}
          <figcaption className="text-sm text-muted">Схема из каталога. Номер на схеме указан у каждой детали.</figcaption>
        </figure>
      ) : null}
      <ul className="grid gap-3">
        {parts.map((part, index) => (
          <li key={`${part.normalizedOe}:${part.callout}:${index}`}>
            <Card className="grid gap-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold break-words">{part.name}</h3>
                  {part.nameZh && part.nameZh !== part.name ? (
                    <p className="zh text-sm text-muted" lang="zh">
                      {part.nameZh}
                    </p>
                  ) : null}
                </div>
                <FitmentBadge fitment={part.fitment} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted">OE</span>
                <span className="font-mono text-[15px] font-semibold break-all">{part.oe}</span>
                <CopyButton value={part.oe} label={`Скопировать номер ${part.oe}`} />
              </div>
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Detail label="№ на схеме" value={part.callout} />
                <Detail label="Кол-во" value={part.quantity} />
                <Detail label="Замена" value={part.replacement} />
              </dl>
              {part.remark ? <p className="text-sm text-muted break-words">{part.remark}</p> : null}
              {part.modelOptional ? <p className="text-sm text-muted break-words">Только для опций: {part.modelOptional}</p> : null}
              {part.modelNotOptional ? <p className="text-sm text-muted break-words">Кроме опций: {part.modelNotOptional}</p> : null}
              <div>
                <ButtonLink href={requestHref(vehicleId, { oe: part.oe, name: part.name })} variant="dark" size="sm">
                  Запросить цену
                </ButtonLink>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
