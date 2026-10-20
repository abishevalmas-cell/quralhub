import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ORDER_STATUS } from "@/components/orders/labels";
import { OrderProgress } from "@/components/orders/order-progress";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { FITMENT, OFFER_KIND } from "@/components/requests/labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, KeyValue, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import type { Actor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatLeadTime } from "@/lib/pricing";
import { AppError } from "@/lib/server/errors";
import { getOrderForCustomer, type CustomerOrderView } from "@/lib/services/orders";
import { formatDate, formatDateTime, formatKzt } from "@/lib/utils";
import { FitFeedbackForm } from "./fit-feedback-form";

export const metadata = { title: "Заказ" };

async function load(actor: Actor, id: string): Promise<CustomerOrderView> {
  try {
    return await getOrderForCustomer(await getDb(), actor, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);
  const { order, offer, request, vehicleLabel, events } = await load(actor, id);
  const fit = FITMENT[offer.fitment];

  const items: [string, React.ReactNode][] = [
    ["Деталь", offer.title],
    ["Тип", OFFER_KIND[offer.kind] ?? offer.kind],
  ];
  if (offer.manufacturer) items.push(["Производитель", offer.manufacturer]);
  if (offer.condition) items.push(["Состояние", offer.condition]);
  if (offer.oe) items.push(["Номер OE", <span key="oe" className="font-mono">{offer.oe}</span>]);
  items.push(["Количество", `${offer.qty} шт.`]);
  items.push(["Срок", formatLeadTime(offer.leadDaysMin, offer.leadDaysMax)]);
  // After delivery the owner's own answer says more than the check before the order; without one the row is dropped.
  if (order.fitFeedback)
    items.push([
      "Совместимость",
      <Badge key="fit" tone={order.fitFeedback === "fits" ? "ok" : "bad"}>
        {order.fitFeedback === "fits" ? "Подошла — ваш ответ" : "Не подошла — ваш ответ"}
      </Badge>,
    ]);
  else if (order.status !== "delivered" && order.status !== "returned")
    items.push(["Совместимость", <Badge key="fit" tone={fit.tone}>{fit.label}</Badge>]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={`Заказ №${order.number} · ${formatDate(order.createdAt)}`}
        title={<span className="break-words">{offer.title}</span>}
        actions={<OrderStatusBadge status={order.status} className="px-3 py-1 text-sm" />}
      >
        <span className="font-semibold text-ink">{formatKzt(order.totalKzt)}</span> · {vehicleLabel ?? "Без машины"} · по заявке{" "}
        <Link href={`/requests/${request.id}`} className="font-semibold text-ink underline">
          №{request.number}
        </Link>
      </PageHeader>

      {order.status === "awaiting_payment" ? (
        <div className="mb-6 grid gap-3 rounded-2xl bg-warn-bg p-4 text-warn sm:p-5" role="status">
          <p>Оплата пока принимается вручную: подборщик пришлёт реквизиты в чате заявки.</p>
          <ButtonLink href={`/requests/${request.id}#chat`} variant="dark" className="justify-self-start">
            Открыть чат заявки
          </ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-6">
          {order.status === "delivered" && !order.fitFeedback ? (
            <Card id="fit" className="scroll-mt-24 p-4 sm:p-5">
              <FitFeedbackForm orderId={order.id} />
            </Card>
          ) : order.fitFeedback === "fits" ? (
            <div id="fit" className="grid gap-1 rounded-2xl bg-ok-bg p-4 text-ok sm:p-5" role="status">
              <p className="font-bold">Вы ответили: деталь подошла</p>
              <p className="text-sm">Спасибо! Отметили это в базе совместимости, так другим владельцам таких же машин будет проще.</p>
            </div>
          ) : order.fitFeedback === "not_fits" ? (
            <div id="fit" className="grid gap-3 rounded-2xl bg-bad-bg p-4 text-bad sm:p-5" role="status">
              <div className="grid gap-1">
                <p className="font-bold">Вы ответили: деталь не подошла</p>
                <p className="text-sm">
                  {order.status === "returned"
                    ? "Возврат оформлен. Подробности — в истории заказа."
                    : "Подборщик свяжется с вами и поможет с возвратом или заменой."}
                </p>
              </div>
              <ButtonLink href={`/requests/${request.id}#chat`} variant="dark" className="justify-self-start">
                Открыть заявку
              </ButtonLink>
            </div>
          ) : null}

          <Card className="grid gap-4 p-4 sm:p-5">
            <h2 className="text-xl font-extrabold tracking-tight">Где заказ</h2>
            <OrderProgress status={order.status} />
          </Card>

          <section aria-labelledby="events-title" className="grid gap-3">
            <h2 id="events-title" className="text-xl font-extrabold tracking-tight">
              История
            </h2>
            <Card className="p-4 sm:p-5">
              {events.length ? (
                <ol className="grid gap-3">
                  {[...events].reverse().map((e) => (
                    <li key={e.id} className="grid gap-0.5 border-b border-dashed border-line pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold">{ORDER_STATUS[e.status]?.label ?? e.status}</span>
                        <time className="text-sm text-muted" dateTime={new Date(e.createdAt).toISOString()}>
                          {formatDateTime(e.createdAt)}
                        </time>
                      </div>
                      {e.note ? <p className="whitespace-pre-line break-words text-sm text-muted">{e.note}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">Событий пока нет.</p>
              )}
            </Card>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="grid gap-3 p-4 sm:p-5">
            <div>
              <div className="text-sm text-muted">Сумма заказа</div>
              <div className="text-3xl font-extrabold tracking-tight">{formatKzt(order.totalKzt)}</div>
            </div>
            <KeyValue items={items} />
            {offer.note ? <p className="whitespace-pre-line break-words rounded-xl bg-soft px-3 py-2 text-sm">{offer.note}</p> : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
