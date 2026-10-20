import { redirect } from "next/navigation";
import { carLook } from "@/components/garage/garage-car";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { CarMedia } from "@/components/requests/car-media";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { ListCard } from "@/components/ui/list-card";
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
    <div className="max-w-4xl">
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
              <ListCard
                href={`/orders/${o.id}`}
                media={<CarMedia look={carLook(o.car)} icon="box" />}
                title={o.offerTitle}
                status={<OrderStatusBadge status={o.status} />}
                meta={
                  <>
                    <span className="font-semibold text-ink">Заказ №{o.number}</span>
                    <span>{o.vehicleLabel ?? "Без машины"}</span>
                    <span>{formatDate(o.createdAt)}</span>
                    <span className="font-semibold text-ink">{formatKzt(o.totalKzt)}</span>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
