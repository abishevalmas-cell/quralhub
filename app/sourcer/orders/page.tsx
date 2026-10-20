import Link from "next/link";
import { redirect } from "next/navigation";
import { ORDER_STATUS } from "@/components/orders/labels";
import { FIT_FEEDBACK, ORDER_STATUS_ZH } from "@/components/sourcer-orders/labels";
import { StaffOnly } from "@/components/sourcer-orders/staff-only";
import { StaffOrderStatusBadge } from "@/components/sourcer-orders/staff-order-status-badge";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/db/schema";
import { isStaffOrderFilter, listOrdersForStaff, staffOrderCounts, type StaffOrderFilter } from "@/lib/services/orders";
import { cn, formatDate, formatKzt } from "@/lib/utils";

export const metadata = { title: "Заказы · 订单" };

type Filter = StaffOrderFilter | "all";
type Props = { searchParams: Promise<{ status?: string | string[] }> };

const hrefFor = (filter: Filter) => (filter === "active" ? "/sourcer/orders" : `/sourcer/orders?status=${filter}`);

export default async function SourcerOrdersPage({ searchParams }: Props) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/sourcer/orders");
  if (!isStaff(actor)) return <StaffOnly />;

  const raw = (await searchParams).status;
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Orders that still need someone's hands come first; an unknown value falls back to them as well.
  const filter: Filter = value === "all" ? "all" : isStaffOrderFilter(value) ? value : "active";
  const db = await getDb();
  const [orders, counts] = await Promise.all([
    listOrdersForStaff(db, actor, { status: filter }),
    staffOrderCounts(db, actor),
  ]);

  const chips: { filter: Filter; label: string; zh: string; n: number }[] = [
    { filter: "active", label: "В работе", zh: "进行中", n: counts.active },
    ...ORDER_STATUSES.filter((s) => counts.byStatus[s] > 0 || s === filter).map((s) => ({
      filter: s as Filter,
      label: ORDER_STATUS[s].label,
      zh: ORDER_STATUS_ZH[s],
      n: counts.byStatus[s],
    })),
    { filter: "all", label: "Все", zh: "全部", n: counts.all },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={
          <>
            Подбор <span className="zh" lang="zh">采购</span>
          </>
        }
        title={
          <>
            Заказы{" "}
            <span className="zh text-muted" lang="zh">
              订单
            </span>
          </>
        }
      >
        Отмечайте этапы заказа: клиент получает уведомление о каждом шаге и видит ваш комментарий.
      </PageHeader>

      <nav aria-label="Фильтр по статусу" className="mb-5">
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const current = chip.filter === filter;
            return (
              <li key={chip.filter}>
                <Link
                  href={hrefFor(chip.filter)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold",
                    current ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink hover:border-ink/30",
                  )}
                >
                  {chip.label}
                  <span className="zh font-medium opacity-70" lang="zh">
                    {chip.zh}
                  </span>
                  <span className={cn("tabular-nums", current ? "text-paper/70" : "text-muted")}>{chip.n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <EmptyState title="Заказов нет">
          {filter === "active"
            ? "Все заказы выданы или закрыты. Новый заказ появится, когда клиент выберет вариант в заявке."
            : "С этим статусом заказов нет."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/sourcer/orders/${o.id}`}
                className="grid gap-2 rounded-2xl border border-line bg-card p-4 transition hover:border-ink/30 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-[17px] font-bold leading-snug">{o.offerTitle}</span>
                  <StaffOrderStatusBadge status={o.status} className="mt-0.5 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span className="font-semibold text-ink">Заказ №{o.number}</span>
                  <span>Заявка №{o.requestNumber}</span>
                  <span>{o.vehicleLabel ?? "Без машины"}</span>
                  {o.oe ? <span className="font-mono text-ink">{o.oe}</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>{o.customerName || o.customerPhone}</span>
                  <span className="font-semibold text-ink">{formatKzt(o.totalKzt)}</span>
                  <span>Обновлён {formatDate(o.updatedAt)}</span>
                  {o.fitFeedback ? (
                    <Badge tone={FIT_FEEDBACK[o.fitFeedback].tone}>
                      {FIT_FEEDBACK[o.fitFeedback].label}{" "}
                      <span className="zh ml-1" lang="zh">
                        {FIT_FEEDBACK[o.fitFeedback].zh}
                      </span>
                    </Badge>
                  ) : null}
                  {o.assignedTo && !o.assignedToMe ? <Badge>Ведёт другой подборщик</Badge> : null}
                  {!o.assignedTo ? <Badge tone="warn">Без подборщика</Badge> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
