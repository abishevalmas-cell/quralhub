import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ORDER_STATUS } from "@/components/orders/labels";
import { AXIS_LABEL, FITMENT, OFFER_KIND, SIDE_LABEL } from "@/components/requests/labels";
import { AdvanceOrderForm } from "@/components/sourcer-orders/advance-order-form";
import { FIT_FEEDBACK, FITMENT_RESULT, FITMENT_SOURCE } from "@/components/sourcer-orders/labels";
import { StaffOnly } from "@/components/sourcer-orders/staff-only";
import { StaffOrderStatusBadge } from "@/components/sourcer-orders/staff-order-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, KeyValue, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { isStaff, type Actor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatCny } from "@/components/sourcer/format";
import { formatLeadTime } from "@/lib/pricing";
import { AppError } from "@/lib/server/errors";
import { getOrderForStaff, type StaffOrderView } from "@/lib/services/orders";
import { formatDate, formatDateTime, formatKzt } from "@/lib/utils";

export const metadata = { title: "Заказ · 订单" };

type Row = [React.ReactNode, React.ReactNode];

async function load(actor: Actor, id: string): Promise<StaffOrderView> {
  try {
    return await getOrderForStaff(await getDb(), actor, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

const zh = (text: string) => (
  <span className="zh font-semibold text-muted" lang="zh">
    {text}
  </span>
);

// Only http(s) links become clickable: the URL is typed by staff and must not run script.
function safeUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}


export default async function SourcerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(`/sourcer/orders/${id}`)}`);
  if (!isStaff(actor)) return <StaffOnly />;
  const view = await load(actor, id);
  const { order, offer, customerOffer: shown, request, vehicle, customer, assignee, events, next, canEdit, fitments } = view;
  const fit = FITMENT[shown.fitment];

  // What the customer sees, built from customerOffer() only.
  const customerItems: Row[] = [
    ["Тип", OFFER_KIND[shown.kind] ?? shown.kind],
    ["Совместимость", <Badge key="fit" tone={fit.tone}>{fit.label}</Badge>],
  ];
  if (shown.manufacturer) customerItems.push(["Производитель", shown.manufacturer]);
  if (shown.condition) customerItems.push(["Состояние", shown.condition]);
  if (shown.oe) customerItems.push(["Номер OE", <span key="oe" className="font-mono">{shown.oe}</span>]);
  customerItems.push(["Количество", `${shown.qty} шт.`]);
  customerItems.push(["Срок", formatLeadTime(shown.leadDaysMin, shown.leadDaysMax)]);

  // INTERNAL purchase data: rendered on this staff page on the server, never handed to a client component.
  const supplierUrl = safeUrl(offer.supplierUrl);
  const margin = offer.costKzt != null ? order.totalKzt - offer.costKzt : null;
  const purchaseItems: Row[] = [
    [<>Закупка {zh("采购价")}</>, formatCny(offer.priceCny)],
    [<>Себестоимость {zh("成本")}</>, formatKzt(offer.costKzt)],
    [<>Маржа {zh("利润")}</>, margin == null ? "—" : <span key="m" className={margin < 0 ? "font-semibold text-bad" : undefined}>{formatKzt(margin)}</span>],
    ["Поставщик", offer.supplierName || "—"],
  ];
  if (offer.supplierUrl)
    purchaseItems.push([
      "Ссылка",
      supplierUrl ? (
        <a key="u" href={supplierUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-semibold underline">
          {supplierUrl}
        </a>
      ) : (
        <span key="u" className="break-all">{offer.supplierUrl}</span>
      ),
    ]);
  if (offer.validUntil) purchaseItems.push(["Цена действует до", formatDateTime(offer.validUntil)]);

  const placement = [request.axis ? AXIS_LABEL[request.axis] : null, request.side ? SIDE_LABEL[request.side] : null]
    .filter(Boolean)
    .join(", ");
  const requestItems: Row[] = [
    ["Заявка", <Link key="r" href={`/sourcer/requests/${request.id}`} className="font-semibold underline">№{request.number}</Link>],
    ["Что искали", request.title],
  ];
  if (request.partName) requestItems.push(["Деталь", request.partName]);
  if (placement) requestItems.push(["Ось и сторона", placement]);
  if (request.oe) requestItems.push(["OE в заявке", <span key="oe" className="font-mono">{request.oe}</span>]);
  requestItems.push(["Количество", `${request.qty} шт.`]);
  requestItems.push(["Подборщик", assignee ? assignee.name || "Без имени" : "Не назначен"]);

  const vehicleItems: Row[] = vehicle ? [["Машина", vehicle.label]] : [];
  if (vehicle?.vin) vehicleItems.push(["VIN", <span key="vin" className="break-all font-mono text-[13px]">{vehicle.vin}</span>]);
  if (vehicle?.trim) vehicleItems.push(["Комплектация", vehicle.trim]);

  const customerRows: Row[] = [
    ["Имя", customer.name || "Не указано"],
    [
      "Телефон",
      customer.phoneDial ? (
        <a key="p" href={`tel:+${customer.phoneDial}`} className="font-semibold underline">
          {customer.phone}
        </a>
      ) : (
        <span key="p" className="grid gap-0.5">
          <span className="font-mono">{customer.phone}</span>
          <span className="text-xs text-muted">Полный номер видит администратор. Пишите клиенту в чате заявки.</span>
        </span>
      ),
    ],
  ];
  if (customer.role === "master") customerRows.push(["СТО", customer.company || "Мастер"]);
  if (customer.city) customerRows.push(["Город", customer.city]);

  const byLabel = (e: StaffOrderView["events"][number]) =>
    e.by === "customer" ? "Клиент" : e.by === "staff" ? e.actorName || "Подборщик" : "Система";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={
          <>
            <Link href="/sourcer/orders" className="underline">
              Заказы <span className="zh" lang="zh">订单</span>
            </Link>{" "}
            · №{order.number} · {formatDate(order.createdAt)}
          </>
        }
        title={<span className="break-words">{shown.title}</span>}
        actions={<StaffOrderStatusBadge status={order.status} className="px-3 py-1 text-sm" />}
      >
        <span className="font-semibold text-ink">{formatKzt(order.totalKzt)}</span> · {vehicle?.label ?? "Без машины"} ·{" "}
        {customer.name || customer.phone}
      </PageHeader>

      {order.status === "awaiting_payment" ? (
        <p className="mb-6 rounded-2xl bg-warn-bg p-4 text-warn sm:p-5" role="status">
          Пришлите клиенту реквизиты в{" "}
          <Link href={`/sourcer/requests/${request.id}`} className="font-semibold underline">
            чате заявки №{request.number}
          </Link>{" "}
          и отметьте оплату, когда деньги придут.
        </p>
      ) : null}
      {order.fitFeedback === "not_fits" && order.status === "delivered" ? (
        <div className="mb-6 grid gap-1 rounded-2xl bg-bad-bg p-4 text-bad sm:p-5" role="status">
          <p className="font-bold">
            Клиент сообщил: деталь не подошла <span className="zh" lang="zh">不适配</span>
          </p>
          <p>Свяжитесь с клиентом и оформите возврат или замену. Комментарий клиента — в чате заявки.</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-6">
          <Card className="grid gap-4 p-4 sm:p-5">
            <h2 className="text-xl font-extrabold tracking-tight">Следующий шаг {zh("下一步")}</h2>
            {next.length === 0 ? (
              <p className="text-muted">
                Заказ завершён: статус «{ORDER_STATUS[order.status].label}» больше не меняется.
              </p>
            ) : !canEdit ? (
              <p className="rounded-xl bg-soft px-3 py-2 text-sm">
                Заявку ведёт {assignee?.name || "другой подборщик"}. Статус заказа меняет он или администратор.
              </p>
            ) : (
              <AdvanceOrderForm orderId={order.id} version={order.version} next={next} />
            )}
          </Card>

          <section aria-labelledby="events-title" className="grid gap-3">
            <h2 id="events-title" className="text-xl font-extrabold tracking-tight">
              История {zh("记录")}
            </h2>
            <Card className="p-4 sm:p-5">
              {events.length ? (
                <ol className="grid gap-3">
                  {[...events].reverse().map((e) => (
                    <li key={e.id} className="grid gap-0.5 border-b border-dashed border-line pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <StaffOrderStatusBadge status={e.status} />
                        <span className="text-sm font-semibold">{byLabel(e)}</span>
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

          <section aria-labelledby="fitments-title" className="grid gap-3">
            <h2 id="fitments-title" className="text-xl font-extrabold tracking-tight">
              База совместимости {zh("适配记录")}
            </h2>
            <Card className="grid gap-4 p-4 sm:p-5">
              {order.fitFeedback ? (
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  Ответ клиента после выдачи:
                  <Badge tone={FIT_FEEDBACK[order.fitFeedback].tone}>
                    {FIT_FEEDBACK[order.fitFeedback].label}
                    <span className="zh ml-1" lang="zh">
                      {FIT_FEEDBACK[order.fitFeedback].zh}
                    </span>
                  </Badge>
                </p>
              ) : order.status === "delivered" ? (
                <p className="text-sm text-muted">Клиент ещё не ответил, подошла ли деталь.</p>
              ) : null}

              {fitments.oe ? (
                <div className="grid gap-2">
                  <h3 className="font-bold">
                    Номер <span className="font-mono">{offer.oe ?? fitments.oe.oe}</span>
                  </h3>
                  {fitments.oe.fits + fitments.oe.notFits === 0 ? (
                    <p className="text-sm text-muted">Отзывов по этому номеру пока нет.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="ok">Подошла: {fitments.oe.fits}</Badge>
                        <Badge tone={fitments.oe.notFits ? "bad" : "neutral"}>Не подошла: {fitments.oe.notFits}</Badge>
                      </div>
                      {fitments.oe.vehicles.length ? (
                        <p className="text-sm text-muted">
                          Подошла на:{" "}
                          {fitments.oe.vehicles
                            .map((v) => [v.brand, v.model, v.year ? String(v.year) : null].filter(Boolean).join(" "))
                            .join(", ")}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">В предложении нет номера OE, поэтому отзыв о совместимости не попадёт в базу.</p>
              )}

              {vehicle?.vin ? (
                <div className="grid gap-2 border-t border-dashed border-line pt-4">
                  <h3 className="font-bold">Эта машина по VIN</h3>
                  {fitments.vin.length ? (
                    <ul className="grid gap-2">
                      {fitments.vin.map((f) => (
                        <li key={f.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-mono font-semibold">{f.oe}</span>
                          <Badge tone={FITMENT_RESULT[f.result].tone}>{FITMENT_RESULT[f.result].label}</Badge>
                          <span className="text-muted">
                            {FITMENT_SOURCE[f.source]} · {formatDate(f.createdAt)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">Записей пока нет.</p>
                  )}
                </div>
              ) : null}
            </Card>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">Клиент видит {zh("客户可见")}</h2>
            <div>
              <div className="text-sm text-muted">Сумма заказа</div>
              <div className="text-3xl font-extrabold tracking-tight">{formatKzt(order.totalKzt)}</div>
            </div>
            <KeyValue items={customerItems} />
            {shown.note ? <p className="whitespace-pre-line break-words rounded-xl bg-soft px-3 py-2 text-sm">{shown.note}</p> : null}
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Закупка {zh("采购")}</h2>
              <Badge tone="warn">Только для команды</Badge>
            </div>
            <KeyValue items={purchaseItems} />
            {offer.internalNote ? (
              <p className="whitespace-pre-line break-words rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn">{offer.internalNote}</p>
            ) : null}
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">Заявка {zh("询价")}</h2>
            <KeyValue items={requestItems} />
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">Машина {zh("车辆")}</h2>
            {vehicle ? <KeyValue items={vehicleItems} /> : <p className="text-sm text-muted">Клиент не указал машину.</p>}
            {vehicle?.decodeStatus === "ambiguous" && !vehicle.trim ? (
              <p className="rounded-xl bg-warn-bg px-3 py-2 text-sm text-warn">Комплектация не уточнена: сверьте деталь по VIN.</p>
            ) : null}
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">Клиент {zh("客户")}</h2>
            <KeyValue items={customerRows} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
