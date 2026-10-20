import { and, asc, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { formatPhone, maskPhone } from "@/lib/auth/phone";
import { isAdmin, isStaff, type Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import {
  offers,
  orderEvents,
  orders,
  ORDER_STATUSES,
  partRequests,
  requestMessages,
  users,
  vehicles,
  type OrderStatus,
} from "@/lib/db/schema";
import { notifyAfterResponse, notifyStaff, notifyUser, type NotifyDeps } from "@/lib/notify";
import { AppError, badRequest, conflict, forbidden, notFound } from "@/lib/server/errors";
import { getPartType } from "@/lib/taxonomy";
import { formatKzt } from "@/lib/utils";
import { assertStaffCanEdit, isUuid } from "./access";
import { FITMENT_LIMITS, fitmentOeKey, fitmentSummaryForOe, fitmentsForVin, fitmentVin, recordFitment } from "./fitments";
import { carRef, notifyRequestStaff, readSnapshot } from "./requests";
import { customerOffer } from "./visibility";

export type OrderDeps = { notify?: NotifyDeps; now?: Date };

const OFFER_GONE = "Этот вариант больше недоступен. Обновите страницу";

// Accepting is the step where money gets involved, so every check runs inside one transaction with the request row
// locked: of two accepts on the same request (two tabs, two offers) exactly one wins and the other gets 409.
export async function acceptOffer(db: Db, actor: Actor, offerId: string, deps: OrderDeps = {}) {
  if (!isUuid(offerId)) throw notFound("Предложение не найдено");
  const now = deps.now ?? new Date();

  const result = await db.transaction(async (tx) => {
    const [first] = await tx.select({ requestId: offers.requestId }).from(offers).where(eq(offers.id, offerId)).limit(1);
    if (!first) throw notFound("Предложение не найдено");
    const [request] = await tx.select().from(partRequests).where(eq(partRequests.id, first.requestId)).for("update");
    if (!request || request.customerId !== actor.id) throw notFound("Предложение не найдено");
    // Re-read the offer under the lock: a sourcer may have withdrawn it a moment ago.
    const [offer] = await tx.select().from(offers).where(eq(offers.id, offerId)).limit(1);
    if (!offer) throw notFound("Предложение не найдено");
    if (request.status !== "offered") {
      throw conflict(request.status === "accepted" ? "По этой заявке вариант уже выбран" : "Заявка сейчас не ждёт выбора варианта");
    }
    if (offer.status !== "published") throw conflict(OFFER_GONE);
    if (offer.validUntil && offer.validUntil.getTime() < now.getTime())
      throw badRequest("Срок этого предложения истёк. Напишите подборщику в чате заявки, он обновит цену");
    if (!Number.isSafeInteger(offer.priceKzt) || offer.priceKzt <= 0) throw conflict(OFFER_GONE);

    const accepted = await tx
      .update(offers)
      .set({ status: "accepted", updatedAt: now })
      .where(and(eq(offers.id, offer.id), eq(offers.status, "published")))
      .returning({ id: offers.id });
    if (!accepted.length) throw conflict(OFFER_GONE);
    await tx
      .update(offers)
      .set({ status: "rejected", updatedAt: now })
      .where(and(eq(offers.requestId, request.id), eq(offers.status, "published"), ne(offers.id, offer.id)));
    const moved = await tx
      .update(partRequests)
      .set({ status: "accepted", version: request.version + 1, updatedAt: now })
      .where(
        and(eq(partRequests.id, request.id), eq(partRequests.version, request.version), eq(partRequests.status, "offered")),
      )
      .returning({ id: partRequests.id });
    if (!moved.length) throw conflict("Заявка изменилась. Обновите страницу");

    // The offer price is for the whole line (its qty included), so the order total is the offer price.
    const totalKzt = offer.priceKzt * 1;
    const [order] = await tx
      .insert(orders)
      .values({
        customerId: actor.id,
        requestId: request.id,
        offerId: offer.id,
        status: "awaiting_payment",
        totalKzt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: orders.id, number: orders.number });
    await tx.insert(orderEvents).values({
      orderId: order.id,
      status: "awaiting_payment",
      note: "Заказ создан. Подборщик пришлёт реквизиты для оплаты в чате заявки",
      actorId: actor.id,
      createdAt: now,
    });
    await tx.insert(requestMessages).values({
      requestId: request.id,
      kind: "system",
      body: `Выбран вариант «${offer.title}» за ${formatKzt(totalKzt)}. Создан заказ №${order.number}.`,
      createdAt: now,
    });
    return { order, request, offerTitle: offer.title, totalKzt };
  });

  await notifyRequestStaff(
    db,
    result.request,
    {
      type: "staff_offer_accepted",
      requestNumber: result.request.number,
      orderNumber: result.order.number,
      offerTitle: result.offerTitle,
      totalLabel: formatKzt(result.totalKzt),
    },
    deps.notify,
  );
  return { id: result.order.id, number: result.order.number };
}

export async function listMyOrders(db: Db, actor: Actor) {
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      totalKzt: orders.totalKzt,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      offerTitle: offers.title,
      requestId: partRequests.id,
      requestNumber: partRequests.number,
      requestTitle: partRequests.title,
      vehicleSnapshot: partRequests.vehicleSnapshot,
      // The car's picture only: its catalog model and paint.
      carModelId: vehicles.modelId,
      carColor: vehicles.color,
    })
    .from(orders)
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .innerJoin(partRequests, eq(partRequests.id, orders.requestId))
    .leftJoin(vehicles, eq(vehicles.id, partRequests.vehicleId))
    .where(eq(orders.customerId, actor.id))
    .orderBy(desc(orders.createdAt), desc(orders.number))
    .limit(200);
  return rows.map(({ vehicleSnapshot, carModelId, carColor, ...row }) => {
    const snapshot = readSnapshot(vehicleSnapshot);
    return {
      ...row,
      vehicleLabel: snapshot?.label ?? null,
      car: snapshot ? carRef(snapshot, { modelId: carModelId, color: carColor }) : null,
    };
  });
}
export type MyOrderItem = Awaited<ReturnType<typeof listMyOrders>>[number];

const MAX_SERIAL = 2_147_483_647;

// Pages take the order id; notification links carry the order number (/orders/42), so both resolve.
function orderRef(ref: string) {
  const value = String(ref ?? "").trim();
  if (isUuid(value)) return eq(orders.id, value);
  if (/^\d{1,10}$/.test(value) && Number(value) > 0 && Number(value) <= MAX_SERIAL) return eq(orders.number, Number(value));
  throw notFound("Заказ не найден");
}

export async function getOrderForCustomer(db: Db, actor: Actor, id: string) {
  const where = orderRef(id);
  const [row] = await db
    .select({ order: orders, offer: offers, request: partRequests })
    .from(orders)
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .innerJoin(partRequests, eq(partRequests.id, orders.requestId))
    .where(where)
    .limit(1);
  if (!row || row.order.customerId !== actor.id) throw notFound("Заказ не найден");
  const events = await db
    .select({ id: orderEvents.id, status: orderEvents.status, note: orderEvents.note, createdAt: orderEvents.createdAt })
    .from(orderEvents)
    .where(eq(orderEvents.orderId, row.order.id))
    .orderBy(asc(orderEvents.createdAt), asc(orderEvents.id));
  return {
    order: {
      id: row.order.id,
      number: row.order.number,
      status: row.order.status,
      totalKzt: row.order.totalKzt,
      fitFeedback: row.order.fitFeedback,
      createdAt: row.order.createdAt,
      updatedAt: row.order.updatedAt,
    },
    offer: customerOffer(row.offer),
    request: { id: row.request.id, number: row.request.number, title: row.request.title },
    vehicleLabel: readSnapshot(row.request.vehicleSnapshot)?.label ?? null,
    events,
  };
}
export type CustomerOrderView = Awaited<ReturnType<typeof getOrderForCustomer>>;

// ---------------------------------------------------------------------------------------------------------------------
// Staff: the order lifecycle

// Same wording as components/orders/labels.ts (a test keeps them in step); notifications are rendered on the server.
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  purchased: "Выкуплен в Китае",
  consolidation: "На складе консолидации",
  in_transit: "В пути",
  customs: "Таможня",
  in_city: "В городе",
  delivered: "Выдан",
  cancelled: "Отменён",
  returned: "Возврат",
};

// The only moves a sourcer can make. Nothing goes back; once bought in China an order can no longer be cancelled,
// only returned after delivery.
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["purchased", "cancelled"],
  purchased: ["consolidation"],
  consolidation: ["in_transit"],
  in_transit: ["customs", "in_city"],
  customs: ["in_city"],
  in_city: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

// The customer sees every note in the order history; for these two a reason is required.
export const NOTE_REQUIRED_STATUSES: readonly OrderStatus[] = ["cancelled", "returned"];
const FINISHED_ORDER_STATUSES: readonly OrderStatus[] = ["delivered", "cancelled", "returned"];
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = ORDER_STATUSES.filter((s) => !FINISHED_ORDER_STATUSES.includes(s));

export const ORDER_LIMITS = { noteMax: 500, fitCommentMax: 1000, staffListMax: 200 } as const;

export type StaffOrderFilter = OrderStatus | "active";

export const isStaffOrderFilter = (value: unknown): value is StaffOrderFilter =>
  value === "active" || (typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value));

const REFRESH = "Обновите страницу и попробуйте ещё раз";
const ORDER_CHANGED = "Заказ изменился. Обновите страницу";

function assertStaff(actor: Actor) {
  if (!isStaff(actor)) throw forbidden("Раздел доступен подборщикам");
}

function canStaffEdit(actor: Actor, request: { assignedTo: string | null }) {
  try {
    assertStaffCanEdit(actor, request);
    return true;
  } catch (error) {
    if (error instanceof AppError) return false;
    throw error;
  }
}

function parseInput<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues[0]?.message;
    throw badRequest(message && !message.startsWith("Expected") && !message.startsWith("Required") ? message : "Проверьте заполнение формы");
  }
  return result.data;
}

// Line breaks stay (the history renders them), other control characters go.
function cleanText(value: string | null | undefined, maxLength: number, tooLong: string): string | null {
  const text = String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length > maxLength) throw badRequest(tooLong);
  return text || null;
}

// "" or "all" means every order; anything else must be a status or "active".
function readFilter(raw: string | null | undefined): StaffOrderFilter | undefined {
  const value = String(raw ?? "").trim();
  if (!value || value === "all") return undefined;
  if (!isStaffOrderFilter(value)) throw badRequest("Неизвестный статус заказа");
  return value;
}

// Same rule as the request view (getRequestForStaff): the full number is for admins only; sourcers talk to the
// customer in the request chat.
const staffPhone = (admin: boolean, phone: string) => (admin ? formatPhone(phone) : maskPhone(phone));

export async function listOrdersForStaff(db: Db, actor: Actor, input: { status?: string | null } = {}) {
  assertStaff(actor);
  const filter = readFilter(input.status);
  const where =
    filter === undefined
      ? undefined
      : filter === "active"
        ? inArray(orders.status, [...ACTIVE_ORDER_STATUSES])
        : eq(orders.status, filter);
  const rows = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      totalKzt: orders.totalKzt,
      fitFeedback: orders.fitFeedback,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      offerTitle: offers.title,
      oe: offers.oe,
      requestId: partRequests.id,
      requestNumber: partRequests.number,
      requestTitle: partRequests.title,
      assignedTo: partRequests.assignedTo,
      vehicleSnapshot: partRequests.vehicleSnapshot,
      customerName: users.name,
      customerPhone: users.phone,
    })
    .from(orders)
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .innerJoin(partRequests, eq(partRequests.id, orders.requestId))
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(where)
    .orderBy(desc(orders.updatedAt), desc(orders.number))
    .limit(ORDER_LIMITS.staffListMax);
  // The list shows the car by name only; the VIN is on the order page.
  const admin = isAdmin(actor);
  return rows.map(({ vehicleSnapshot, customerPhone, ...row }) => ({
    ...row,
    customerPhone: staffPhone(admin, customerPhone),
    phoneMasked: !admin,
    vehicleLabel: readSnapshot(vehicleSnapshot)?.label ?? null,
    assignedToMe: row.assignedTo === actor.id,
  }));
}
export type StaffOrderItem = Awaited<ReturnType<typeof listOrdersForStaff>>[number];

export async function staffOrderCounts(db: Db, actor: Actor) {
  assertStaff(actor);
  const rows = await db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status);
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const r of rows) if (r.status in byStatus) byStatus[r.status] = Number(r.n);
  const sum = (list: readonly OrderStatus[]) => list.reduce((acc, s) => acc + byStatus[s], 0);
  return { all: sum(ORDER_STATUSES), active: sum(ACTIVE_ORDER_STATUSES), byStatus };
}

// Staff view of one order. `offer` carries the INTERNAL purchase fields: render it on staff pages only and never pass
// it to a client component. `customerOffer` is exactly what the customer sees.
export async function getOrderForStaff(db: Db, actor: Actor, id: string) {
  assertStaff(actor);
  const where = orderRef(id);
  const [row] = await db
    .select({
      order: orders,
      offer: offers,
      request: partRequests,
      customer: { id: users.id, name: users.name, phone: users.phone, company: users.company, city: users.city, role: users.role },
    })
    .from(orders)
    .innerJoin(offers, eq(offers.id, orders.offerId))
    .innerJoin(partRequests, eq(partRequests.id, orders.requestId))
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(where)
    .limit(1);
  if (!row) throw notFound("Заказ не найден");
  const { order, offer, request } = row;
  const vehicle = readSnapshot(request.vehicleSnapshot);
  const admin = isAdmin(actor);

  const [eventRows, assigneeRows, oeSummary, vinHistory] = await Promise.all([
    db
      .select({
        id: orderEvents.id,
        status: orderEvents.status,
        note: orderEvents.note,
        createdAt: orderEvents.createdAt,
        actorId: orderEvents.actorId,
        actorName: users.name,
        actorRole: users.role,
      })
      .from(orderEvents)
      .leftJoin(users, eq(users.id, orderEvents.actorId))
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(asc(orderEvents.createdAt), asc(orderEvents.id)),
    request.assignedTo
      ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, request.assignedTo)).limit(1)
      : Promise.resolve([]),
    offer.oe ? fitmentSummaryForOe(db, offer.oe) : Promise.resolve(null),
    vehicle?.vin ? fitmentsForVin(db, vehicle.vin, 20) : Promise.resolve([]),
  ]);

  return {
    order: {
      id: order.id,
      number: order.number,
      status: order.status,
      totalKzt: order.totalKzt,
      fitFeedback: order.fitFeedback,
      version: order.version,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
    offer,
    customerOffer: customerOffer(offer),
    request: {
      id: request.id,
      number: request.number,
      title: request.title,
      status: request.status,
      partTypeId: request.partTypeId,
      partName: getPartType(request.partTypeId)?.ru ?? null,
      axis: request.axis,
      side: request.side,
      oe: request.oe,
      qty: request.qty,
      assignedTo: request.assignedTo,
    },
    vehicle,
    customer: {
      id: row.customer.id,
      name: row.customer.name,
      company: row.customer.company,
      city: row.customer.city,
      role: row.customer.role,
      phone: staffPhone(admin, row.customer.phone),
      phoneMasked: !admin,
      // Digits for a tel: link, admins only.
      phoneDial: admin ? row.customer.phone : null,
    },
    assignee: assigneeRows[0] ?? null,
    events: eventRows.map((e) => ({
      id: e.id,
      status: e.status,
      note: e.note,
      createdAt: e.createdAt,
      by:
        e.actorId && e.actorId === order.customerId
          ? ("customer" as const)
          : e.actorRole === "sourcer" || e.actorRole === "admin"
            ? ("staff" as const)
            : ("system" as const),
      actorName: e.actorName,
    })),
    next: [...ORDER_TRANSITIONS[order.status]],
    canEdit: canStaffEdit(actor, request),
    fitments: {
      oe: oeSummary,
      vin: vinHistory.map((f) => ({
        id: f.id,
        oe: f.oe,
        result: f.result,
        source: f.source,
        partTypeId: f.partTypeId,
        orderId: f.orderId,
        createdAt: f.createdAt,
      })),
    },
  };
}
export type StaffOrderView = Awaited<ReturnType<typeof getOrderForStaff>>;

export const AdvanceOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES, { errorMap: () => ({ message: "Выберите следующий статус заказа" }) }),
  note: z.string({ invalid_type_error: "Комментарий должен быть текстом" }).max(ORDER_LIMITS.noteMax * 2).nullish(),
  version: z.number({ required_error: REFRESH, invalid_type_error: REFRESH }).int(REFRESH),
});
export type AdvanceOrderInput = z.input<typeof AdvanceOrderSchema>;

const NOTE_TOO_LONG = `Комментарий — до ${ORDER_LIMITS.noteMax} символов`;

export async function advanceOrder(db: Db, actor: Actor, orderId: string, input: AdvanceOrderInput, deps: OrderDeps = {}) {
  assertStaff(actor);
  const data = parseInput(AdvanceOrderSchema, input);
  const note = cleanText(data.note, ORDER_LIMITS.noteMax, NOTE_TOO_LONG);
  if (!isUuid(orderId)) throw notFound("Заказ не найден");
  const target = data.status;
  if (NOTE_REQUIRED_STATUSES.includes(target) && !note)
    throw badRequest(`Укажите причину ${target === "cancelled" ? "отмены" : "возврата"}: клиент увидит её в истории заказа`);
  const now = deps.now ?? new Date();

  const result = await db.transaction(async (tx) => {
    const [first] = await tx.select({ requestId: orders.requestId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!first) throw notFound("Заказ не найден");
    // Same lock order as acceptOffer: the request row first, then the order.
    const [request] = await tx.select().from(partRequests).where(eq(partRequests.id, first.requestId)).for("update");
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!request || !order) throw notFound("Заказ не найден");
    assertStaffCanEdit(actor, request);
    if (order.version !== data.version) throw conflict(ORDER_CHANGED);
    if (!ORDER_TRANSITIONS[order.status].includes(target))
      throw badRequest(`Из статуса «${ORDER_STATUS_LABEL[order.status]}» нельзя перейти в «${ORDER_STATUS_LABEL[target]}»`);

    const [moved] = await tx
      .update(orders)
      .set({ status: target, version: order.version + 1, updatedAt: now })
      .where(and(eq(orders.id, order.id), eq(orders.version, order.version), eq(orders.status, order.status)))
      .returning();
    if (!moved) throw conflict(ORDER_CHANGED);
    await tx.insert(orderEvents).values({ orderId: order.id, status: target, note, actorId: actor.id, createdAt: now });

    if (target === "delivered") {
      await tx
        .update(partRequests)
        .set({ status: "closed", version: request.version + 1, updatedAt: now })
        .where(eq(partRequests.id, request.id));
      await tx.insert(requestMessages).values({
        requestId: request.id,
        kind: "system",
        body: `Заказ №${order.number} выдан. Заявка закрыта.`,
        createdAt: now,
      });
    } else if (target === "cancelled") {
      // The offer goes out of play and the request returns to the queue, so the sourcer can offer something else.
      // With nobody leading it, it goes to the "new" queue, where every sourcer sees it.
      await tx
        .update(offers)
        .set({ status: "withdrawn", updatedAt: now })
        .where(and(eq(offers.id, order.offerId), eq(offers.status, "accepted")));
      await tx
        .update(partRequests)
        .set({ status: request.assignedTo ? "searching" : "new", version: request.version + 1, updatedAt: now })
        .where(eq(partRequests.id, request.id));
      await tx.insert(requestMessages).values({
        requestId: request.id,
        kind: "system",
        body: `Заказ №${order.number} отменён.\nПричина: ${note}\nПодборщик продолжит поиск и пришлёт новые варианты.`,
        createdAt: now,
      });
    }
    return moved;
  });

  await notifyAfterResponse(() =>
    notifyUser(
      db,
      result.customerId,
      { type: "order_status", orderNumber: result.number, statusLabel: ORDER_STATUS_LABEL[result.status] },
      deps.notify,
    ),
  );
  return { id: result.id, number: result.number, status: result.status, version: result.version, updatedAt: result.updatedAt };
}

// ---------------------------------------------------------------------------------------------------------------------
// Customer: did the part fit?

export const FIT_RESULTS = ["fits", "not_fits"] as const;
export type FitResult = (typeof FIT_RESULTS)[number];

const FIT_COMMENT_TOO_LONG = `Комментарий — до ${ORDER_LIMITS.fitCommentMax} символов`;

export const FitFeedbackSchema = z.object({
  result: z.enum(FIT_RESULTS, { errorMap: () => ({ message: "Ответьте, подошла ли деталь" }) }),
  comment: z
    .string({ invalid_type_error: "Комментарий должен быть текстом" })
    .max(ORDER_LIMITS.fitCommentMax * 2, FIT_COMMENT_TOO_LONG)
    .nullish(),
});
export type FitFeedbackInput = z.input<typeof FitFeedbackSchema>;

const validYear = (year: number | null | undefined) =>
  typeof year === "number" && Number.isInteger(year) && year >= FITMENT_LIMITS.yearMin && year <= FITMENT_LIMITS.yearMax
    ? year
    : null;

// The owner answers once, after delivery. The answer goes into our compatibility base (no VIN leaves the server),
// and a part that did not fit becomes a task for the team.
export async function confirmFit(
  db: Db,
  actor: Actor,
  orderId: string,
  result: FitResult,
  comment?: string | null,
  deps: OrderDeps = {},
) {
  const data = parseInput(FitFeedbackSchema, { result, comment });
  const text = cleanText(data.comment, ORDER_LIMITS.fitCommentMax, FIT_COMMENT_TOO_LONG);
  if (!isUuid(orderId)) throw notFound("Заказ не найден");
  const now = deps.now ?? new Date();

  const outcome = await db.transaction(async (tx) => {
    const [first] = await tx.select({ requestId: orders.requestId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!first) throw notFound("Заказ не найден");
    // Same lock order as acceptOffer and advanceOrder: the request row first, then the order. The opposite order
    // could deadlock with a sourcer moving the same order at the same moment.
    const [request] = await tx.select().from(partRequests).where(eq(partRequests.id, first.requestId)).for("update");
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!order || !request || order.customerId !== actor.id) throw notFound("Заказ не найден");
    if (order.fitFeedback) throw conflict("Вы уже ответили, подошла ли деталь");
    if (order.status !== "delivered") throw badRequest("Ответить можно после того, как заказ выдан");
    const [offer] = await tx.select().from(offers).where(eq(offers.id, order.offerId)).limit(1);
    if (!offer) throw notFound("Заказ не найден");

    // The version moves too: a sourcer looking at an older page has to see the answer before acting on the order.
    const [saved] = await tx
      .update(orders)
      .set({ fitFeedback: data.result, version: order.version + 1, updatedAt: now })
      .where(and(eq(orders.id, order.id), isNull(orders.fitFeedback), eq(orders.status, "delivered")))
      .returning({ id: orders.id });
    if (!saved) throw conflict("Вы уже ответили, подошла ли деталь");

    // Without an OE number on the offer there is nothing to pair the car with.
    const oe = fitmentOeKey(offer.oe);
    const vehicle = readSnapshot(request.vehicleSnapshot);
    const fitment = oe
      ? await recordFitment(tx, {
          oe,
          result: data.result,
          source: "install_feedback",
          vin: fitmentVin(vehicle?.vin),
          brand: vehicle?.brand,
          model: vehicle?.model,
          year: validYear(vehicle?.year),
          trim: vehicle?.trim,
          partTypeId: getPartType(request.partTypeId) ? request.partTypeId : null,
          orderId: order.id,
          createdBy: actor.id,
        })
      : null;

    const lines =
      data.result === "fits"
        ? [`Клиент подтвердил: деталь по заказу №${order.number} подошла.`]
        : [`Клиент сообщил: деталь по заказу №${order.number} не подошла.`];
    if (text) lines.push(`Комментарий: ${text}`);
    if (data.result === "not_fits") lines.push("Подборщик свяжется с клиентом и оформит возврат или замену.");
    await tx.insert(requestMessages).values({ requestId: request.id, kind: "system", body: lines.join("\n"), createdAt: now });
    await tx.update(partRequests).set({ updatedAt: now }).where(eq(partRequests.id, request.id));

    return { order, offer, request, fitmentId: fitment?.id ?? null };
  });

  if (data.result === "not_fits") {
    await notifyAfterResponse(() =>
      notifyStaff(
        db,
        { type: "staff_order_issue", orderNumber: outcome.order.number, offerTitle: outcome.offer.title, comment: text || null },
        deps.notify,
      ),
    );
  }
  return { fitFeedback: data.result, fitmentId: outcome.fitmentId };
}
