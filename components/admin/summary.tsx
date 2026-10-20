import Link from "next/link";
import { ORDER_STATUS } from "@/components/orders/labels";
import { REQUEST_STATUS } from "@/components/requests/labels";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ORDER_STATUSES, REQUEST_STATUSES, type OrderStatus } from "@/lib/db/schema";
import type { Dashboard } from "@/lib/services/admin";
import { cn } from "@/lib/utils";
import { formatCount } from "./format";
import { ROLE, ROLE_ORDER } from "./labels";

// Orders that are neither delivered nor cancelled or returned.
const OPEN_ORDERS: OrderStatus[] = ["awaiting_payment", "paid", "purchased", "consolidation", "in_transit", "customs", "in_city"];

type Row = { key: string; label: string; tone: Tone; n: number };

function Breakdown({ title, rows, total }: { title: string; rows: Row[]; total: number }) {
  return (
    <Card className="grid content-start gap-3 p-4 sm:p-5">
      <h3 className="font-bold">{title}</h3>
      <dl className="grid">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 border-b border-dashed border-line py-1.5 last:border-0">
            {/* Empty rows step back with a neutral badge rather than faded text, which would fall below AA contrast. */}
            <dt>
              <Badge tone={row.n === 0 ? "neutral" : row.tone}>{row.label}</Badge>
            </dt>
            <dd className={cn("font-semibold tabular-nums", row.n === 0 && "text-muted")}>{formatCount(row.n)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">
        Всего: <span className="font-semibold text-ink tabular-nums">{formatCount(total)}</span>
      </p>
    </Card>
  );
}

export function Summary({ data }: { data: Dashboard }) {
  const openOrders = OPEN_ORDERS.reduce((sum, status) => sum + data.ordersByStatus[status], 0);
  const staff = data.usersByRole.sourcer + data.usersByRole.admin;
  const tiles = [
    {
      label: "Новые заявки",
      value: data.requestsByStatus.new,
      note: (
        <Link href="/sourcer" className="font-semibold text-ink underline">
          Открыть очередь
        </Link>
      ),
    },
    { label: "Заявок за 7 дней", value: data.requestsLast7Days, note: `Всего: ${formatCount(data.totals.requests)}` },
    { label: "Заказы в работе", value: openOrders, note: `Ждут оплаты: ${formatCount(data.ordersByStatus.awaiting_payment)}` },
    { label: "Пользователи", value: data.totals.users, note: `Сотрудников: ${formatCount(staff)}` },
  ];

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="grid content-start gap-1 rounded-[18px] border border-line bg-card p-4">
            <dt className="text-sm font-semibold text-muted">{tile.label}</dt>
            <dd className="text-[32px] font-bold leading-tight tracking-[-0.03em] tabular-nums">{formatCount(tile.value)}</dd>
            <dd className="text-sm text-muted">{tile.note}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 md:grid-cols-3">
        <Breakdown
          title="Заявки по статусам"
          total={data.totals.requests}
          rows={REQUEST_STATUSES.map((s) => ({ key: s, label: REQUEST_STATUS[s].label, tone: REQUEST_STATUS[s].tone, n: data.requestsByStatus[s] }))}
        />
        <Breakdown
          title="Заказы по статусам"
          total={data.totals.orders}
          rows={ORDER_STATUSES.map((s) => ({ key: s, label: ORDER_STATUS[s].label, tone: ORDER_STATUS[s].tone, n: data.ordersByStatus[s] }))}
        />
        <Breakdown
          title="Пользователи по ролям"
          total={data.totals.users}
          rows={ROLE_ORDER.map((r) => ({ key: r, label: ROLE[r].label, tone: ROLE[r].tone, n: data.usersByRole[r] }))}
        />
      </div>
    </>
  );
}
