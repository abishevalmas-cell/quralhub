import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { QueueItem } from "@/lib/services/sourcing";
import { formatDateTime, pluralRu } from "@/lib/utils";
import { formatAge } from "./format";
import { StaffStatusBadge } from "./staff-status-badge";
import { TakeButton } from "./take-button";

const ageLabel = (waiting: boolean, age: string) =>
  age === "только что" ? (waiting ? "пришла только что" : "обновлена только что") : waiting ? `ждёт ${age}` : `обновлена ${age} назад`;

export function QueueCard({ item, now }: { item: QueueItem; now: Date }) {
  const href = `/sourcer/requests/${item.id}`;
  const open = item.status !== "closed" && item.status !== "cancelled";
  const canTake = open && !item.assignee;
  const waiting = item.status === "new";
  return (
    <article className="grid gap-3 rounded-[18px] border border-line bg-card p-4 transition hover:border-line-strong sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div className="grid min-w-0 gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="font-bold text-ink">№{item.number}</span>
          <StaffStatusBadge status={item.status} />
          <time dateTime={new Date(waiting ? item.createdAt : item.updatedAt).toISOString()} title={formatDateTime(waiting ? item.createdAt : item.updatedAt)}>
            {ageLabel(waiting, formatAge(waiting ? item.createdAt : item.updatedAt, now))}
          </time>
        </div>
        <h2 className="text-[17px] font-bold leading-snug">
          <Link href={href} className="break-words hover:underline">
            {item.title}
          </Link>
          {item.qty > 1 ? <span className="font-semibold text-muted"> · {item.qty} шт.</span> : null}
        </h2>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
          <Icon name="car" className="size-4" />
          <span className="text-ink">{item.vehicleLabel ?? "Машина не указана"}</span>
          {item.vinMasked ? <span className="font-mono">{item.vinMasked}</span> : null}
          {item.oe ? <span className="font-mono">OE {item.oe}</span> : null}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="camera" className="size-4" />
            {item.attachmentCount} фото
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="box" className="size-4" />
            {item.offerCount} {pluralRu(item.offerCount, "предложение", "предложения", "предложений")}
            {item.draftCount ? `, ${item.draftCount} ${pluralRu(item.draftCount, "черновик", "черновика", "черновиков")}` : ""}
          </span>
          {item.expiredCount ? (
            <span className="font-semibold text-warn">
              Цена истекла: {item.expiredCount} {pluralRu(item.expiredCount, "предложение", "предложения", "предложений")}
            </span>
          ) : null}
          <span>{item.assignee ? `Ведёт: ${item.assignee.isMe ? "вы" : item.assignee.name}` : "Не назначена"}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canTake ? <TakeButton requestId={item.id} version={item.version} open /> : null}
        <ButtonLink href={href} variant="light" size="sm">
          Открыть
          <Icon name="chevron" className="size-4" />
        </ButtonLink>
      </div>
    </article>
  );
}
