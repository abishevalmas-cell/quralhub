import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/garage/copy-button";
import { ORDER_STATUS } from "@/components/orders/labels";
import { AXIS_LABEL, SIDE_LABEL } from "@/components/requests/labels";
import { Composer } from "@/components/sourcer/composer";
import { AXIS_ZH, SIDE_ZH } from "@/components/sourcer/labels";
import { OfferForm } from "@/components/sourcer/offer-form";
import { OfferItem } from "@/components/sourcer/offer-item";
import { PublishButton } from "@/components/sourcer/publish-button";
import { StaffOnly } from "@/components/sourcer/staff-only";
import { StaffPhotos } from "@/components/sourcer/staff-photos";
import { StaffStatusBadge } from "@/components/sourcer/staff-status-badge";
import { StaffThread } from "@/components/sourcer/staff-thread";
import { StatusActions } from "@/components/sourcer/status-actions";
import { VehiclePanel } from "@/components/sourcer/vehicle-panel";
import { Zh } from "@/components/sourcer/zh";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, KeyValue, PageHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getActor } from "@/lib/auth/current";
import { isStaff, type Actor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { AppError } from "@/lib/server/errors";
import { ACTIVE_ORDER_STATUSES } from "@/lib/services/orders";
import {
  getRequestForStaff,
  OFFER_EDITABLE_STATUSES,
  PUBLISHABLE_STATUSES,
  type StaffRequestView,
} from "@/lib/services/sourcing";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Заявка · 采购" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string | string[] }> };

async function load(actor: Actor, id: string): Promise<StaffRequestView> {
  try {
    return await getRequestForStaff(await getDb(), actor, id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
}

function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-extrabold tracking-tight">
      {children}
    </h2>
  );
}

export default async function SourcerRequestPage({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(`/sourcer/requests/${id}`)}`);
  // Checked before anything is loaded: this page carries purchase prices, suppliers and internal notes.
  if (!isStaff(actor)) return <StaffOnly />;
  const view = await load(actor, id);
  const { request, customer } = view;
  // Notifications link by request number; the page itself lives at the id.
  if (request.id !== id) redirect(`/sourcer/requests/${request.id}`);

  const base = `/sourcer/requests/${request.id}`;
  const editParam = Array.isArray(query.edit) ? query.edit[0] : query.edit;
  const now = new Date();
  const canDraft = view.canEdit && OFFER_EDITABLE_STATUSES.includes(request.status);
  const drafts = view.offers.filter((o) => o.status === "draft");
  const live = view.offers.filter((o) => o.status === "published" || o.status === "accepted");
  const archived = view.offers.filter((o) => o.status === "withdrawn" || o.status === "rejected");
  const editing = canDraft ? (editParam === "new" ? "new" : drafts.find((o) => o.id === editParam)?.id ?? null) : null;
  const expiredDraft = drafts.find((o) => o.validUntil && new Date(o.validUntil).getTime() <= now.getTime());
  const publishBlocked = !PUBLISHABLE_STATUSES.includes(request.status)
    ? request.status === "new"
      ? "Сначала возьмите заявку в работу."
      : request.status === "clarification"
        ? "Заявка ждёт ответа клиента. Нажмите «Продолжить поиск», чтобы опубликовать предложения."
        : "Заявка закрыта, предложения больше не публикуются."
    : editing
      ? "Сначала сохраните или закройте форму предложения."
      : expiredDraft
        ? `Цена в черновике «${expiredDraft.title}» устарела. Откройте его и сохраните заново.`
        : null;
  const defaults = { title: request.title, oe: request.oe ?? "", qty: request.qty };
  const customerName = customer?.name?.trim() || "без имени";

  const details: [ReactNode, ReactNode][] = [];
  if (request.partName)
    details.push([
      <>
        Деталь <Zh>配件</Zh>
      </>,
      <span key="part" className="grid gap-0.5">
        <span>{request.partName}</span>
        {request.partNameZh ? (
          <span className="flex items-center gap-1">
            <Zh className="text-[17px] font-semibold">{request.partNameZh}</Zh>
            <CopyButton value={request.partNameZh} label="Скопировать название по-китайски" />
          </span>
        ) : null}
      </span>,
    ]);
  if (request.axis || request.side)
    details.push([
      <>
        Ось и сторона <Zh>位置</Zh>
      </>,
      [
        request.axis ? `${AXIS_LABEL[request.axis]} ${AXIS_ZH[request.axis]}` : null,
        request.side ? `${SIDE_LABEL[request.side]} ${SIDE_ZH[request.side]}` : null,
      ]
        .filter(Boolean)
        .join(", "),
    ]);
  if (request.oe)
    details.push([
      <>
        Номер OE <Zh>零件号</Zh>
      </>,
      <span key="oe" className="flex items-center gap-1">
        <span className="break-all font-mono">{request.oe}</span>
        <CopyButton value={request.oe} label="Скопировать номер OE" />
      </span>,
    ]);
  details.push([
    <>
      Количество <Zh>数量</Zh>
    </>,
    `${request.qty} шт.`,
  ]);
  if (request.description)
    details.push(["Подробности", <span key="d" className="whitespace-pre-line">{request.description}</span>]);

  const customerItems: [ReactNode, ReactNode][] = [];
  if (customer) {
    customerItems.push(["Имя", customer.name?.trim() || <span className="text-muted">не указано</span>]);
    customerItems.push([
      "Телефон",
      <span key="phone" className="grid gap-0.5">
        <span className="font-mono">{customer.phone}</span>
        {customer.phoneMasked ? <span className="text-xs text-muted">Полный номер видит администратор. Пишите клиенту в переписке.</span> : null}
      </span>,
    ]);
    if (customer.role === "master")
      customerItems.push(["СТО", <Badge key="m" tone="hand">{customer.company?.trim() || "Мастер"}</Badge>]);
    if (customer.city) customerItems.push(["Город", customer.city]);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/sourcer" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        ← Очередь <Zh>队列</Zh>
      </Link>
      <PageHeader
        eyebrow={`Заявка №${request.number} · ${formatDateTime(request.createdAt)}`}
        title={<span className="break-words">{request.title}</span>}
        actions={<StaffStatusBadge status={request.status} className="px-3 py-1 text-sm" />}
      >
        {view.assignee ? `Ведёт: ${view.assignee.isMe ? "вы" : view.assignee.name}` : "Заявка ни на кого не назначена"}
      </PageHeader>

      <Card className="mb-4 p-4 sm:p-5">
        <StatusActions
          requestId={request.id}
          version={request.version}
          status={request.status}
          assignee={view.assignee ? { name: view.assignee.name, isMe: view.assignee.isMe } : null}
          canEdit={view.canEdit}
          orderActive={Boolean(view.order && ACTIVE_ORDER_STATUSES.includes(view.order.status))}
        />
      </Card>

      {view.order ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ok-bg p-4 text-ok">
          <div className="grid gap-0.5">
            <p className="font-bold">
              Заказ №{view.order.number} <Zh className="font-normal">订单</Zh>
            </p>
            <p className="text-sm">Статус: {ORDER_STATUS[view.order.status]?.label ?? view.order.status}</p>
          </div>
          <ButtonLink href={`/sourcer/orders/${view.order.id}`} variant="dark">
            Открыть заказ
          </ButtonLink>
        </div>
      ) : null}

      <nav aria-label="Разделы заявки" className="mb-4 flex flex-wrap gap-2 lg:hidden">
        <a href="#offers" className="rounded-xl bg-soft px-3 py-2 text-sm font-semibold">
          Предложения · {live.length + drafts.length}
        </a>
        <a href="#chat" className="rounded-xl bg-soft px-3 py-2 text-sm font-semibold">
          Переписка · {view.messages.length}
        </a>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid min-w-0 content-start gap-4">
          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">
              Что ищем <Zh className="font-normal text-muted">需求</Zh>
            </h2>
            <KeyValue items={details} />
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">
              Машина <Zh className="font-normal text-muted">车辆</Zh>
            </h2>
            <VehiclePanel vehicle={view.vehicle} />
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">
              Клиент <Zh className="font-normal text-muted">客户</Zh>
            </h2>
            {customer ? <KeyValue items={customerItems} /> : <p className="text-sm text-muted">Аккаунт клиента удалён.</p>}
          </Card>

          <Card className="grid gap-3 p-4 sm:p-5">
            <h2 className="font-bold">
              Фото <Zh className="font-normal text-muted">图片</Zh> · {view.attachments.length}
            </h2>
            <StaffPhotos photos={view.attachments.map((a) => ({ id: a.id, name: a.name, mime: a.mime }))} />
          </Card>

          <section id="chat" aria-labelledby="chat-title" className="grid scroll-mt-24 gap-3">
            <SectionTitle id="chat-title">
              Переписка <Zh className="text-base font-normal text-muted">沟通</Zh>
            </SectionTitle>
            <Card className="grid gap-5 p-4 sm:p-5">
              <StaffThread messages={view.messages} customerName={customerName} />
              <div className="border-t border-line pt-4">
                <Composer
                  requestId={request.id}
                  version={request.version}
                  status={request.status}
                  canEdit={view.canEdit}
                  chatOpen={view.chatOpen}
                />
              </div>
            </Card>
          </section>
        </div>

        <section id="offers" aria-labelledby="offers-title" className="grid min-w-0 scroll-mt-24 content-start gap-4">
          <SectionTitle id="offers-title">
            Предложения <Zh className="text-base font-normal text-muted">报价</Zh>
          </SectionTitle>

          {live.length ? (
            <div className="grid gap-3">
              <h3 className="text-sm font-bold text-muted">
                Видит клиент <Zh className="font-normal">已发布</Zh>
              </h3>
              {live.map((offer) => (
                <OfferItem key={offer.id} offer={offer} canEdit={view.canEdit} editHref={base} now={now} />
              ))}
            </div>
          ) : null}

          <div className="grid gap-3">
            <h3 className="text-sm font-bold text-muted">
              Черновики <Zh className="font-normal">草稿</Zh> · {drafts.length}
            </h3>
            {drafts.map((offer) =>
              editing === offer.id ? (
                <OfferForm
                  key={offer.id}
                  requestId={request.id}
                  offer={offer}
                  defaults={defaults}
                  vinConfirmable={view.vinConfirmable}
                  doneHref={base}
                />
              ) : (
                <OfferItem
                  key={offer.id}
                  offer={offer}
                  canEdit={canDraft}
                  editHref={`${base}?edit=${offer.id}#offer-form`}
                  now={now}
                />
              ),
            )}
            {editing === "new" ? (
              <OfferForm requestId={request.id} defaults={defaults} vinConfirmable={view.vinConfirmable} doneHref={base} />
            ) : canDraft ? (
              <ButtonLink href={`${base}?edit=new#offer-form`} variant="soft" scroll={false} className="justify-self-start">
                <Icon name="plus" />
                Новое предложение <Zh className="font-normal">新报价</Zh>
              </ButtonLink>
            ) : null}
            {!drafts.length && editing !== "new" ? (
              <p className="text-sm text-muted">
                {canDraft
                  ? "Черновиков нет. Добавьте вариант: клиент увидит его только после публикации."
                  : view.canEdit
                    ? "Новые предложения к этой заявке не добавить."
                    : "Предложения добавляет подборщик, который ведёт заявку."}
              </p>
            ) : null}
          </div>

          {drafts.length && view.canEdit ? (
            <PublishButton requestId={request.id} version={request.version} drafts={drafts.length} blockedReason={publishBlocked} />
          ) : null}

          {archived.length ? (
            <details className="rounded-2xl border border-line bg-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                Отозванные и не выбранные · {archived.length}
              </summary>
              <div className="grid gap-3 border-t border-line p-3">
                {archived.map((offer) => (
                  <OfferItem key={offer.id} offer={offer} canEdit={false} editHref={base} now={now} />
                ))}
              </div>
            </details>
          ) : null}
        </section>
      </div>
    </div>
  );
}
