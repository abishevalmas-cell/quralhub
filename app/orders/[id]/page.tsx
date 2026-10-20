import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ORDER_STATUS } from "@/components/orders/labels";
import { OrderProgress } from "@/components/orders/order-progress";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { FITMENT, OFFER_KIND } from "@/components/requests/labels";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardTitle, KeyValue, PageHeader, SectionTitle } from "@/components/ui/card";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
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
    <div>
      <PageHeader
        eyebrow={`Заказ №${order.number} · ${formatDate(order.createdAt)}`}
        title={<span className="break-words">{offer.title}</span>}
        actions={<OrderStatusBadge status={order.status} pill />}
      >
        <span className="font-semibold text-ink">{formatKzt(order.totalKzt)}</span> · {vehicleLabel ?? "Без машины"} · по заявке{" "}
        <Link href={`/requests/${request.id}`} className="font-semibold text-ink underline">
          №{request.number}
        </Link>
      </PageHeader>

      {order.status === "awaiting_payment" ? (
        <Callout
          tone="warn"
          icon="card"
          role="status"
          className="mb-6"
          action={
            <ButtonLink href={`/requests/${request.id}#chat`} variant="strong">
              Открыть чат заявки
            </ButtonLink>
          }
        >
          <p className="text-[15px]">Оплата пока принимается вручную: подборщик пришлёт реквизиты в чате заявки.</p>
        </Callout>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-6">
          {order.status === "delivered" && !order.fitFeedback ? (
            <Card id="fit" className="scroll-mt-24 p-4 sm:p-5">
              <FitFeedbackForm orderId={order.id} />
            </Card>
          ) : order.fitFeedback === "fits" ? (
            <Callout id="fit" tone="ok" icon="check" role="status" title="Вы ответили: деталь подошла">
              Спасибо! Отметили это в базе совместимости, так другим владельцам таких же машин будет проще.
            </Callout>
          ) : order.fitFeedback === "not_fits" ? (
            <Callout
              id="fit"
              tone="bad"
              icon="info"
              role="status"
              title="Вы ответили: деталь не подошла"
              action={
                <ButtonLink href={`/requests/${request.id}#chat`} variant="strong">
                  Открыть заявку
                </ButtonLink>
              }
            >
              {order.status === "returned"
                ? "Возврат оформлен. Подробности — в истории заказа."
                : "Подборщик свяжется с вами и поможет с возвратом или заменой."}
            </Callout>
          ) : null}

          <Card className="grid gap-4 p-4 sm:p-5">
            <SectionTitle>Где заказ</SectionTitle>
            <OrderProgress status={order.status} />
          </Card>

          <section aria-labelledby="events-title" className="grid gap-3">
            <SectionTitle id="events-title">История</SectionTitle>
            <Card className="p-4 sm:p-5">
              {events.length ? (
                <Timeline label="История заказа">
                  {[...events].reverse().map((e, i) => (
                    <TimelineItem
                      key={e.id}
                      state={i === 0 ? "current" : "done"}
                      srState={false}
                      title={ORDER_STATUS[e.status]?.label ?? e.status}
                      meta={
                        <time dateTime={new Date(e.createdAt).toISOString()}>{formatDateTime(e.createdAt)}</time>
                      }
                    >
                      {e.note ? <p className="whitespace-pre-line break-words">{e.note}</p> : null}
                    </TimelineItem>
                  ))}
                </Timeline>
              ) : (
                <p className="text-sm text-muted">Событий пока нет.</p>
              )}
            </Card>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="grid gap-3 p-4 sm:p-5">
            <CardTitle>Сумма заказа</CardTitle>
            <div className="-mt-1 text-[30px] font-bold leading-tight tracking-[-0.035em]">{formatKzt(order.totalKzt)}</div>
            <KeyValue items={items} />
            {offer.note ? <p className="whitespace-pre-line break-words rounded-[12px] bg-soft px-3.5 py-2.5 text-sm">{offer.note}</p> : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}
