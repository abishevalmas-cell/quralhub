import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ORDER_STATUS } from "@/components/orders/labels";
import { CancelRequestButton } from "@/components/requests/cancel-request-button";
import { AXIS_LABEL, REQUEST_STATUS, SIDE_LABEL } from "@/components/requests/labels";
import { MessageForm } from "@/components/requests/message-form";
import { MessageThread } from "@/components/requests/message-thread";
import { OfferCard } from "@/components/requests/offer-card";
import { PhotoGallery } from "@/components/requests/photo-gallery";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, KeyValue, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import type { Actor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/server/errors";
import { CANCELLABLE_STATUSES, getRequestForCustomer, type CustomerRequestView } from "@/lib/services/requests";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Заявка" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

async function load(actor: Actor, id: string): Promise<CustomerRequestView> {
  try {
    return await getRequestForCustomer(await getDb(), actor, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

export default async function RequestPage({ params, searchParams }: Props) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(`/requests/${id}`)}`);
  const view = await load(actor, id);
  // Notification links open /requests/<number>; the page itself lives at the id.
  if (view.request.id !== id) redirect(`/requests/${view.request.id}`);
  const { request, vehicle, offers, order } = view;
  const status = REQUEST_STATUS[request.status];
  const open = request.status !== "closed" && request.status !== "cancelled";
  const now = new Date();
  const placement = [request.axis ? AXIS_LABEL[request.axis] : null, request.side ? SIDE_LABEL[request.side] : null]
    .filter(Boolean)
    .join(", ");

  const details: [string, React.ReactNode][] = [];
  if (request.partName) details.push(["Деталь", request.partName]);
  if (placement) details.push(["Ось и сторона", placement]);
  if (request.oe) details.push(["Номер OE", <span key="oe" className="font-mono">{request.oe}</span>]);
  details.push(["Количество", `${request.qty} шт.`]);
  if (request.description) details.push(["Подробности", <span key="d" className="whitespace-pre-line">{request.description}</span>]);

  const vehicleItems: [string, React.ReactNode][] = vehicle ? [["Машина", vehicle.label]] : [];
  if (vehicle?.vin) vehicleItems.push(["VIN", <span key="vin" className="break-all font-mono text-[13px]">{vehicle.vin}</span>]);
  if (vehicle?.trim) vehicleItems.push(["Комплектация", vehicle.trim]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={`Заявка №${request.number} · ${formatDate(request.createdAt)}`}
        title={<span className="break-words">{request.title}</span>}
        actions={<RequestStatusBadge status={request.status} className="px-3 py-1 text-sm" />}
      >
        {status.hint}
      </PageHeader>

      {created ? (
        <div className="mb-6 grid gap-2 rounded-2xl bg-ok-bg p-4 text-ok sm:p-5" role="status">
          <p className="font-bold">Заявка отправлена</p>
          {view.attachments.length ? (
            <p>Фото прикреплены. Подборщик ответит в чате ниже.</p>
          ) : (
            <p>
              Добавьте фото старой детали или места установки: по ним подборщик быстрее найдёт нужную.{" "}
              <a href="#photos" className="font-semibold underline">
                Добавить фото
              </a>
            </p>
          )}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <section aria-labelledby="offers-title" className="grid gap-3">
            <h2 id="offers-title" className="text-xl font-extrabold tracking-tight">
              Предложения
            </h2>
            {order ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ok-bg p-4 text-ok">
                <div className="grid gap-0.5">
                  <p className="font-bold">Заказ №{order.number} создан</p>
                  <p className="text-sm">Статус: {ORDER_STATUS[order.status]?.label ?? order.status}</p>
                </div>
                <ButtonLink href={`/orders/${order.id}`} variant="primary">
                  Открыть заказ
                </ButtonLink>
              </div>
            ) : null}
            {offers.length ? (
              offers.map((offer) => <OfferCard key={offer.id} offer={offer} canAccept={request.status === "offered"} now={now} />)
            ) : (
              <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-center text-muted">
                {open ? "Пока нет предложений. Когда подборщик найдёт варианты, они появятся здесь." : "Предложений не было."}
              </p>
            )}
          </section>

          <section id="chat" aria-labelledby="chat-title" className="grid scroll-mt-24 gap-3">
            <h2 id="chat-title" className="text-xl font-extrabold tracking-tight">
              Переписка
            </h2>
            <Card className="grid gap-5 p-4 sm:p-5">
              <MessageThread messages={view.messages} />
              {view.chatOpen ? (
                <div className="border-t border-line pt-4">
                  <MessageForm requestId={request.id} awaitingAnswer={request.status === "clarification"} />
                </div>
              ) : null}
            </Card>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">Машина</h2>
            {vehicle ? (
              <KeyValue items={vehicleItems} />
            ) : (
              <p className="text-sm text-muted">
                Машина не указана. Подборщик может попросить VIN в чате.{" "}
                <Link href="/garage" className="font-semibold text-ink underline">
                  Гараж
                </Link>
              </p>
            )}
            {vehicle?.decodeStatus === "ambiguous" && !vehicle.trim ? (
              <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn">Комплектация не уточнена — подборщик сверит детали по VIN.</p>
            ) : null}
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">Что ищем</h2>
            <KeyValue items={details} />
          </Card>

          <Card id="photos" className="grid scroll-mt-24 gap-3 p-4 sm:p-5">
            <h2 className="font-bold">Фото</h2>
            <PhotoGallery
              requestId={request.id}
              photos={view.attachments.map((a) => ({ id: a.id, name: a.name, mime: a.mime }))}
              canUpload={open}
            />
          </Card>

          {CANCELLABLE_STATUSES.includes(request.status) ? (
            <CancelRequestButton requestId={request.id} version={request.version} />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
