import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { listMyOrders } from "@/lib/services/orders";
import { formatDate, formatKzt } from "@/lib/utils";

export const metadata = { title: "Заказы" };

export default async function OrdersPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/orders");
  const orders = await listMyOrders(await getDb(), actor);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Доставка из Китая" title="Заказы">
        Здесь видно, где сейчас каждая деталь: от оплаты до выдачи в вашем городе.
      </PageHeader>
      {orders.length === 0 ? (
        <EmptyState
          title="Заказов пока нет"
          action={
            <ButtonLink href="/requests" variant="primary">
              Мои заявки
            </ButtonLink>
          }
        >
          Заказ появится, когда вы выберете вариант в заявке.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="grid gap-2 rounded-2xl border border-line bg-card p-4 transition hover:border-ink/30 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-[17px] font-bold leading-snug">{o.offerTitle}</span>
                  <OrderStatusBadge status={o.status} className="mt-0.5 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>Заказ №{o.number}</span>
                  <span>{o.vehicleLabel ?? "Без машины"}</span>
                  <span>{formatDate(o.createdAt)}</span>
                  <span className="font-semibold text-ink">{formatKzt(o.totalKzt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
