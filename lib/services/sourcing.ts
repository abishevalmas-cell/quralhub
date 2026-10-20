import { and, asc, count, desc, eq, gt, ilike, inArray, isNull, notInArray, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { z } from "zod";
import { formatPhone, maskPhone } from "@/lib/auth/phone";
import { isAdmin, isStaff, type Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import {
  attachments,
  FITMENT_LEVELS,
  OFFER_KINDS,
  offers,
  orders,
  partRequests,
  REQUEST_STATUSES,
  requestMessages,
  users,
  vehicles,
  type FitmentLevel,
  type RequestStatus,
} from "@/lib/db/schema";
import { notifyAfterResponse, notifyUser, type NotificationEvent, type NotifyDeps } from "@/lib/notify";
import {
  computeQuote,
  fenToCnyString,
  getPricingSettings,
  LEAD_TIME_MESSAGES,
  LIMITS,
  parseCnyToFen,
  pricingSettingsChangedAt,
  PRICING_MESSAGES,
  toScaled,
  validateLeadTime,
  type Quote,
} from "@/lib/pricing";
import { badRequest, conflict, forbidden, notFound } from "@/lib/server/errors";
import { getPartType, zhLabel } from "@/lib/taxonomy";
import { formatKzt } from "@/lib/utils";
import { maskVin } from "@/lib/vin";
import { assertStaffCanEdit, isUuid } from "./access";
import { catalogAvailability, trimConfirmed } from "./catalog";
import { fitmentOeKey } from "./fitments";
import { ACTIVE_ORDER_STATUSES } from "./orders";
import { MessageSchema, normalizeRequestOe, readSnapshot, requestChatOpen, requestFitFeedback, type VehicleSnapshot } from "./requests";

// The sourcer's side of a request: the queue, taking work, talking to the customer, and offers with prices.
// Every function checks that the actor is staff; changes also go through assertStaffCanEdit, so a sourcer
// works only on unassigned requests and their own, and an admin on any.

export type SourcingDeps = { notify?: NotifyDeps; now?: Date };

type RequestRow = typeof partRequests.$inferSelect;
type OfferRow = typeof offers.$inferSelect;
type VehicleRow = typeof vehicles.$inferSelect;

export const CONFLICT_MESSAGE = "Заявка изменилась. Обновите страницу";
export const TAKEN_MESSAGE = "Подборщик взял заявку в работу";
const STAFF_ONLY = "Раздел доступен подборщикам";

export const QUEUE_VIEWS = ["new", "mine", "clarification", "offered", "all"] as const;
export type QueueView = (typeof QUEUE_VIEWS)[number];

// The only status moves a sourcer makes by hand. Accepting an offer is the customer's move (lib/services/orders.ts).
export const STATUS_TRANSITIONS: Readonly<Record<RequestStatus, readonly RequestStatus[]>> = {
  new: ["searching", "cancelled"],
  searching: ["clarification", "offered", "cancelled"],
  clarification: ["searching", "cancelled"],
  offered: ["searching", "closed"],
  accepted: ["closed"],
  closed: [],
  cancelled: [],
};

export const STATUS_NAME: Record<RequestStatus, string> = {
  new: "Новая",
  clarification: "Нужно уточнение",
  searching: "Ищем",
  offered: "Есть предложения",
  accepted: "Вариант выбран",
  closed: "Закрыта",
  cancelled: "Отменена",
};

const FINISHED: RequestStatus[] = ["closed", "cancelled"];
// Offers can be drafted while the customer has not chosen yet.
export const OFFER_EDITABLE_STATUSES: readonly RequestStatus[] = ["new", "searching", "clarification", "offered"];
export const PUBLISHABLE_STATUSES: readonly RequestStatus[] = ["searching", "offered"];
export const CLARIFIABLE_STATUSES: readonly RequestStatus[] = ["new", "searching", "clarification"];

export const OFFER_LIMITS = {
  titleMin: 2,
  titleMax: 160,
  manufacturerMax: 80,
  conditionMax: 80,
  noteMax: 1000,
  supplierNameMax: 120,
  supplierUrlMax: 500,
  internalNoteMax: 2000,
  reasonMax: 500,
  validDaysMin: 1,
  validDaysMax: 14,
  // The yuan rate moves, so a price is binding for two days unless the sourcer says otherwise.
  validDaysDefault: 2,
} as const;

const SEARCH_MAX = 100;
const QUEUE_LIMIT = 200;
const DAY_MS = 24 * 3600 * 1000;

export const OFFER_MESSAGES = {
  title: `Название — от ${OFFER_LIMITS.titleMin} до ${OFFER_LIMITS.titleMax} символов`,
  kind: "Выберите тип: оригинал, OEM, аналог или б/у",
  fitment: "Выберите, как проверена совместимость",
  manufacturer: `Производитель — не длиннее ${OFFER_LIMITS.manufacturerMax} символов`,
  condition: `Состояние — не длиннее ${OFFER_LIMITS.conditionMax} символов`,
  note: `Комментарий для клиента — не длиннее ${OFFER_LIMITS.noteMax} символов`,
  supplierName: `Поставщик — не длиннее ${OFFER_LIMITS.supplierNameMax} символов`,
  supplierUrl: "Ссылка на товар — адрес, который начинается с http:// или https://",
  internalNote: `Внутренняя заметка — не длиннее ${OFFER_LIMITS.internalNoteMax} символов`,
  priceKzt: "Цена для клиента — целое число тенге больше 0",
  validDays: `Цена действует от ${OFFER_LIMITS.validDaysMin} до ${OFFER_LIMITS.validDaysMax} дней`,
  needPrice: "Укажите цену в Китае в юанях или цену для клиента в тенге",
  needWeight: "Укажите вес одной детали в кг — без него не посчитать доставку",
  staleCost:
    "Сохранённый расчёт устарел: срок цены истёк или изменились настройки цен. Укажите вес одной детали в кг, чтобы пересчитать по текущему курсу",
  vinConfirmed:
    "«Подходит по VIN» можно отметить, только когда VIN расшифрован, комплектация известна и каталог по VIN для машины открывается. Выберите «Нужна проверка» или «Ручной подбор»",
  vinConfirmedOe: "«Подходит по VIN» требует номер OE из каталога этого VIN. Укажите номер или выберите «Нужна проверка»",
} as const;

// ---------------------------------------------------------------------------------------------------------------------
// Helpers

function assertStaff(actor: Actor) {
  if (!isStaff(actor)) throw forbidden(STAFF_ONLY);
}

const stripControls = (s: string) => s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
const oneLine = (s: string) => stripControls(s).replace(/\s+/g, " ").trim();

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues[0]?.message;
    throw badRequest(
      message && !message.startsWith("Expected") && !message.startsWith("Required") ? message : "Проверьте заполнение формы",
    );
  }
  return result.data;
}

// Request pages are opened by id; links in staff notifications carry the request number instead.
async function findRequest(db: Db, ref: string): Promise<RequestRow | null> {
  const value = String(ref ?? "").trim();
  if (isUuid(value)) {
    const [row] = await db.select().from(partRequests).where(eq(partRequests.id, value)).limit(1);
    return row ?? null;
  }
  if (/^\d{1,9}$/.test(value)) {
    const [row] = await db.select().from(partRequests).where(eq(partRequests.number, Number(value))).limit(1);
    return row ?? null;
  }
  return null;
}

async function loadForStaff(db: Db, actor: Actor, ref: string): Promise<RequestRow> {
  assertStaff(actor);
  const row = await findRequest(db, ref);
  if (!row) throw notFound("Заявка не найдена");
  return row;
}

async function loadForEdit(db: Db, actor: Actor, ref: string): Promise<RequestRow> {
  const row = await loadForStaff(db, actor, ref);
  assertStaffCanEdit(actor, row);
  return row;
}

function checkVersion(request: RequestRow, version: unknown) {
  if (typeof version !== "number" || !Number.isSafeInteger(version)) throw badRequest("Обновите страницу и попробуйте ещё раз");
  if (request.version !== version) throw conflict(CONFLICT_MESSAGE);
}

// Every change of status or assignee bumps the version, guarded by the version the caller saw.
async function bump(tx: Db, request: RequestRow, set: Partial<typeof partRequests.$inferInsert>, now: Date, extra?: SQL) {
  const updated = await tx
    .update(partRequests)
    .set({ ...set, version: request.version + 1, updatedAt: now })
    .where(and(eq(partRequests.id, request.id), eq(partRequests.version, request.version), extra))
    .returning({
      id: partRequests.id,
      number: partRequests.number,
      status: partRequests.status,
      assignedTo: partRequests.assignedTo,
      version: partRequests.version,
      updatedAt: partRequests.updatedAt,
    });
  if (!updated.length) throw conflict(CONFLICT_MESSAGE);
  return updated[0];
}
export type RequestChange = Awaited<ReturnType<typeof bump>>;

const changeOf = (r: RequestRow): RequestChange => ({
  id: r.id,
  number: r.number,
  status: r.status,
  assignedTo: r.assignedTo,
  version: r.version,
  updatedAt: r.updatedAt,
});

const staffName = (actor: Actor) => actor.name?.trim() || "подборщик без имени";
const addDays = (now: Date, days: number) => new Date(now.getTime() + days * DAY_MS);

// "Подходит по VIN" needs a VIN, an unambiguous trim and a VIN catalog that actually opens for the car: not an
// unsupported brand, and not epc_id "0" (decoded, but the catalog is empty, as for Li Auto and Zeekr in the trial).
// The live car wins over the snapshot: the owner may have picked their trim after sending the request. Without the
// car row only a decoded snapshot with a catalog counts.
type ConfirmableVehicle = Pick<VehicleRow, "vin" | "decodeStatus" | "candidates" | "selectedCandidateId" | "epc" | "epcId">;
export function vinConfirmableFor(vehicle: ConfirmableVehicle | null, snapshot: VehicleSnapshot | null): boolean {
  if (vehicle) {
    const catalog = catalogAvailability(vehicle);
    return Boolean(vehicle.vin) && trimConfirmed(vehicle) && catalog.available && catalog.reason === null;
  }
  return Boolean(snapshot?.vin) && snapshot?.decodeStatus === "decoded" && Boolean(snapshot?.epc);
}

// The OE must be a real catalog number too: "fits by VIN" without a number confirms nothing.
export const vinConfirmedOfferOk = (oe: string | null, vehicle: ConfirmableVehicle | null, snapshot: VehicleSnapshot | null) =>
  Boolean(fitmentOeKey(oe)) && vinConfirmableFor(vehicle, snapshot);

async function loadVehicle(db: Db, request: RequestRow): Promise<VehicleRow | null> {
  if (!request.vehicleId) return null;
  const [row] = await db.select().from(vehicles).where(eq(vehicles.id, request.vehicleId)).limit(1);
  return row && row.ownerId === request.customerId ? row : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Queue

export const isQueueView = (value: unknown): value is QueueView => QUEUE_VIEWS.includes(value as QueueView);
export const parseQueueView = (value: unknown): QueueView => (isQueueView(value) ? value : "new");

function viewCondition(view: QueueView, actor: Actor): SQL | undefined {
  switch (view) {
    // Nobody leads it and somebody has to: new requests, and searches that lost their sourcer (released, a cancelled
    // order, a demoted sourcer).
    case "new":
      return and(inArray(partRequests.status, ["new", "searching"]), isNull(partRequests.assignedTo));
    case "mine":
      return and(eq(partRequests.assignedTo, actor.id), notInArray(partRequests.status, FINISHED));
    case "clarification":
      return eq(partRequests.status, "clarification");
    case "offered":
      return eq(partRequests.status, "offered");
    default:
      return undefined;
  }
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);
const compactSql = (column: SQLWrapper) => sql`regexp_replace(upper(coalesce(${column}, '')), '[^A-Z0-9]', '', 'g')`;

// One box finds a request by number (123, №123, #123), words of the title, an OE number written with or without
// separators (in the request or in any of its offers) or the end of the VIN.
function searchCondition(raw: string | null | undefined): SQL | undefined {
  const q = oneLine(String(raw ?? "")).slice(0, SEARCH_MAX);
  if (!q) return undefined;
  const ors: SQL[] = [ilike(partRequests.title, `%${escapeLike(q)}%`)];
  const number = /^[#№]?\s*(\d{1,9})$/.exec(q);
  if (number) ors.push(eq(partRequests.number, Number(number[1])));
  const compact = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length >= 3) {
    const pattern = `%${compact}%`;
    ors.push(sql`${compactSql(partRequests.oe)} like ${pattern}`);
    ors.push(
      sql`exists (select 1 from ${offers} where ${offers.requestId} = ${partRequests.id} and ${compactSql(offers.oe)} like ${pattern})`,
    );
  }
  if (compact.length >= 4 && compact.length <= 17)
    ors.push(sql`upper(coalesce(${partRequests.vehicleSnapshot} ->> 'vin', '')) like ${`%${compact}`}`);
  return or(...ors);
}

export type QueueInput = { view?: QueueView | string | null; q?: string | null };

export async function listQueue(db: Db, actor: Actor, input: QueueInput = {}, deps: { now?: Date } = {}) {
  assertStaff(actor);
  const now = deps.now ?? new Date();
  const view = input.view == null || input.view === "" ? "new" : input.view;
  if (!isQueueView(view)) throw badRequest("Неизвестный раздел очереди");
  const rows = await db
    .select({
      id: partRequests.id,
      number: partRequests.number,
      title: partRequests.title,
      status: partRequests.status,
      oe: partRequests.oe,
      qty: partRequests.qty,
      vehicleSnapshot: partRequests.vehicleSnapshot,
      assignedTo: partRequests.assignedTo,
      assigneeName: users.name,
      version: partRequests.version,
      createdAt: partRequests.createdAt,
      updatedAt: partRequests.updatedAt,
    })
    .from(partRequests)
    .leftJoin(users, eq(users.id, partRequests.assignedTo))
    .where(and(viewCondition(view, actor), searchCondition(input.q)))
    // New requests are served first come, first served; everything else by the latest activity.
    .orderBy(
      ...(view === "new"
        ? [asc(partRequests.createdAt), asc(partRequests.number)]
        : [desc(partRequests.updatedAt), desc(partRequests.number)]),
    )
    .limit(QUEUE_LIMIT);

  const ids = rows.map((r) => r.id);
  const [photoRows, offerRows] = ids.length
    ? await Promise.all([
        db
          .select({ requestId: attachments.requestId, n: count() })
          .from(attachments)
          .where(inArray(attachments.requestId, ids))
          .groupBy(attachments.requestId),
        db
          .select({
            requestId: offers.requestId,
            offers: sql<number>`count(*) filter (where ${offers.status} not in ('draft', 'withdrawn'))`,
            drafts: sql<number>`count(*) filter (where ${offers.status} = 'draft')`,
            // Published, but the price is no longer binding: the customer cannot accept it until it is refreshed.
            expired: sql<number>`count(*) filter (where ${offers.status} = 'published' and ${offers.validUntil} <= ${now})`,
          })
          .from(offers)
          .where(inArray(offers.requestId, ids))
          .groupBy(offers.requestId),
      ])
    : [[], []];
  const photos = new Map(photoRows.map((r) => [r.requestId, Number(r.n)]));
  const offerCounts = new Map(
    offerRows.map((r) => [r.requestId, { offers: Number(r.offers), drafts: Number(r.drafts), expired: Number(r.expired) }]),
  );

  return rows.map((r) => {
    const snapshot = readSnapshot(r.vehicleSnapshot);
    return {
      id: r.id,
      number: r.number,
      title: r.title,
      status: r.status,
      oe: r.oe,
      qty: r.qty,
      version: r.version,
      vehicleLabel: snapshot?.label ?? null,
      vinMasked: snapshot?.vin ? maskVin(snapshot.vin) : null,
      assignee: r.assignedTo ? { id: r.assignedTo, name: r.assigneeName?.trim() || "Без имени", isMe: r.assignedTo === actor.id } : null,
      attachmentCount: photos.get(r.id) ?? 0,
      offerCount: offerCounts.get(r.id)?.offers ?? 0,
      draftCount: offerCounts.get(r.id)?.drafts ?? 0,
      expiredCount: offerCounts.get(r.id)?.expired ?? 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });
}
export type QueueItem = Awaited<ReturnType<typeof listQueue>>[number];

export async function queueCounts(db: Db, actor: Actor): Promise<Record<Exclude<QueueView, "all">, number>> {
  assertStaff(actor);
  const [row] = await db
    .select({
      new: sql<number>`count(*) filter (where ${partRequests.status} in ('new', 'searching') and ${partRequests.assignedTo} is null)`,
      mine: sql<number>`count(*) filter (where ${partRequests.assignedTo} = ${actor.id}::uuid and ${partRequests.status} not in ('closed', 'cancelled'))`,
      clarification: sql<number>`count(*) filter (where ${partRequests.status} = 'clarification')`,
      offered: sql<number>`count(*) filter (where ${partRequests.status} = 'offered')`,
    })
    .from(partRequests);
  return {
    new: Number(row?.new ?? 0),
    mine: Number(row?.mine ?? 0),
    clarification: Number(row?.clarification ?? 0),
    offered: Number(row?.offered ?? 0),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// One request, everything included. Staff only: internal notes, supplier data and purchase prices are in here.

// A saved cost is reused (an edit without a weight) only while the draft's price is still binding and nobody has
// changed the pricing settings since the draft was saved. Otherwise the weight is asked again and the cost recomputed
// at the current rate: offers keep no weight column.
export function savedCostReusable(
  offer: Pick<OfferRow, "costKzt" | "validUntil" | "updatedAt">,
  pricingChangedAt: Date | null,
  now: Date,
): boolean {
  if (offer.costKzt == null || !offer.validUntil || offer.validUntil.getTime() <= now.getTime()) return false;
  return !pricingChangedAt || pricingChangedAt.getTime() <= offer.updatedAt.getTime();
}

type PricingContext = { pricingChangedAt: Date | null; now: Date };

// Dates become strings so the offer list can go to the editor (a client component on a staff-only page) as is.
export function staffOffer(offer: OfferRow, context: PricingContext = { pricingChangedAt: null, now: new Date() }) {
  return {
    id: offer.id,
    requestId: offer.requestId,
    status: offer.status,
    title: offer.title,
    oe: offer.oe,
    manufacturer: offer.manufacturer,
    kind: offer.kind,
    condition: offer.condition,
    qty: offer.qty,
    priceKzt: offer.priceKzt,
    leadDaysMin: offer.leadDaysMin,
    leadDaysMax: offer.leadDaysMax,
    fitment: offer.fitment,
    note: offer.note,
    // INTERNAL
    priceCny: offer.priceCny,
    costKzt: offer.costKzt,
    supplierName: offer.supplierName,
    supplierUrl: offer.supplierUrl,
    internalNote: offer.internalNote,
    validUntil: offer.validUntil ? offer.validUntil.toISOString() : null,
    costReusable: savedCostReusable(offer, context.pricingChangedAt, context.now),
    createdAt: offer.createdAt.toISOString(),
    updatedAt: offer.updatedAt.toISOString(),
  };
}
export type StaffOffer = ReturnType<typeof staffOffer>;

export async function getRequestForStaff(db: Db, actor: Actor, ref: string, deps: { now?: Date } = {}) {
  const request = await loadForStaff(db, actor, ref);
  const now = deps.now ?? new Date();
  const [vehicle, customerRows, assigneeRows, messageRows, attachmentRows, offerRows, orderRows, pricingChangedAt] = await Promise.all([
    loadVehicle(db, request),
    db
      .select({ id: users.id, name: users.name, phone: users.phone, role: users.role, company: users.company, city: users.city })
      .from(users)
      .where(eq(users.id, request.customerId))
      .limit(1),
    request.assignedTo
      ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, request.assignedTo)).limit(1)
      : Promise.resolve([]),
    db
      .select({
        id: requestMessages.id,
        kind: requestMessages.kind,
        body: requestMessages.body,
        internal: requestMessages.internal,
        authorId: requestMessages.authorId,
        authorName: users.name,
        createdAt: requestMessages.createdAt,
      })
      .from(requestMessages)
      .leftJoin(users, eq(users.id, requestMessages.authorId))
      .where(eq(requestMessages.requestId, request.id))
      .orderBy(asc(requestMessages.createdAt), asc(requestMessages.id)),
    db
      .select({ id: attachments.id, name: attachments.name, mime: attachments.mime, size: attachments.size, createdAt: attachments.createdAt })
      .from(attachments)
      .where(eq(attachments.requestId, request.id))
      .orderBy(asc(attachments.createdAt), asc(attachments.id)),
    db.select().from(offers).where(eq(offers.requestId, request.id)).orderBy(asc(offers.createdAt), asc(offers.id)),
    db
      .select({ id: orders.id, number: orders.number, status: orders.status, fitFeedback: orders.fitFeedback })
      .from(orders)
      .where(eq(orders.requestId, request.id))
      .orderBy(desc(orders.createdAt))
      .limit(1),
    pricingSettingsChangedAt(db),
  ]);

  const part = getPartType(request.partTypeId);
  const snapshot = readSnapshot(request.vehicleSnapshot);
  const customer = customerRows[0];
  const assignee = assigneeRows[0];
  const admin = isAdmin(actor);

  return {
    request: {
      id: request.id,
      number: request.number,
      status: request.status,
      title: request.title,
      description: request.description,
      partTypeId: request.partTypeId,
      partName: part?.ru ?? null,
      partNameZh: part ? zhLabel(part, request.axis, request.side) : null,
      axis: request.axis,
      side: request.side,
      oe: request.oe,
      qty: request.qty,
      assignedTo: request.assignedTo,
      version: request.version,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
    assignee: request.assignedTo
      ? { id: request.assignedTo, name: assignee?.name?.trim() || "Без имени", isMe: request.assignedTo === actor.id }
      : null,
    canEdit: admin || !request.assignedTo || request.assignedTo === actor.id,
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          role: customer.role,
          company: customer.company,
          city: customer.city,
          // The full number is for admins only; sourcers talk to the customer in the request chat.
          phone: admin ? formatPhone(customer.phone) : maskPhone(customer.phone),
          phoneMasked: !admin,
        }
      : null,
    vehicle: snapshot
      ? {
          ...snapshot,
          current: vehicle
            ? {
                id: vehicle.id,
                decodeStatus: vehicle.decodeStatus,
                trim: vehicle.trim,
                buildDate: vehicle.buildDate,
                epc: vehicle.epc,
                candidates: vehicle.candidates,
                selectedCandidateId: vehicle.selectedCandidateId,
                archived: Boolean(vehicle.archivedAt),
              }
            : null,
        }
      : null,
    vinConfirmable: vinConfirmableFor(vehicle, snapshot),
    messages: messageRows.map((m) => ({
      id: m.id,
      kind: m.kind,
      internal: m.internal,
      from:
        m.kind === "system"
          ? ("system" as const)
          : m.authorId && m.authorId === request.customerId
            ? ("customer" as const)
            : ("staff" as const),
      authorName: m.authorName?.trim() || null,
      mine: m.authorId === actor.id,
      body: m.body,
      createdAt: m.createdAt,
    })),
    attachments: attachmentRows,
    offers: offerRows.map((offer) => staffOffer(offer, { pricingChangedAt, now })),
    order: orderRows[0] ?? null,
    chatOpen: requestChatOpen(request.status, orderRows[0]?.fitFeedback),
  };
}
export type StaffRequestView = Awaited<ReturnType<typeof getRequestForStaff>>;
export type StaffMessage = StaffRequestView["messages"][number];

// ---------------------------------------------------------------------------------------------------------------------
// Taking, releasing and moving a request

export async function takeRequest(db: Db, actor: Actor, id: string, version?: number | null, deps: SourcingDeps = {}) {
  const request = await loadForStaff(db, actor, id);
  if (FINISHED.includes(request.status)) throw conflict("Заявка закрыта. Обновите страницу");
  if (request.assignedTo === actor.id) return changeOf(request);
  if (request.assignedTo) throw conflict("Заявку уже ведёт другой подборщик. Обновите страницу");
  if (version != null) checkVersion(request, version);
  const now = deps.now ?? new Date();
  const fromNew = request.status === "new";
  return db.transaction(async (tx) => {
    const updated = await bump(
      tx,
      request,
      { assignedTo: actor.id, ...(fromNew ? { status: "searching" as const } : {}) },
      now,
      isNull(partRequests.assignedTo),
    );
    await tx.insert(requestMessages).values(
      fromNew
        ? { requestId: request.id, authorId: actor.id, kind: "system", body: TAKEN_MESSAGE, createdAt: now }
        : // The customer already knows the request is in work; a change of hands is for staff only.
          { requestId: request.id, authorId: actor.id, kind: "system", internal: true, body: `Заявку взял: ${staffName(actor)}`, createdAt: now },
    );
    return updated;
  });
}

export async function releaseRequest(db: Db, actor: Actor, id: string, version: number, deps: SourcingDeps = {}) {
  const request = await loadForEdit(db, actor, id);
  checkVersion(request, version);
  if (!request.assignedTo) throw conflict("Заявка ни на кого не назначена. Обновите страницу");
  const now = deps.now ?? new Date();
  // A request nobody is searching for goes back to the "new" queue, where the next sourcer will see it.
  const backToQueue = request.status === "searching";
  return db.transaction(async (tx) => {
    const updated = await bump(tx, request, { assignedTo: null, ...(backToQueue ? { status: "new" as const } : {}) }, now);
    await tx.insert(requestMessages).values({
      requestId: request.id,
      authorId: actor.id,
      kind: "system",
      internal: true,
      body: backToQueue ? `Снял(а) с себя: ${staffName(actor)}. Заявка вернулась в очередь` : `Снял(а) с себя: ${staffName(actor)}`,
      createdAt: now,
    });
    return updated;
  });
}

const STATUS_MESSAGE: Partial<Record<RequestStatus, string>> = {
  clarification: "Подборщику нужно уточнение. Ответьте в чате.",
  offered: "Предложения снова доступны для выбора.",
  cancelled: "Подборщик отменил заявку.",
  closed: "Заявка закрыта.",
};

const ReasonSchema = z
  .string({ invalid_type_error: `Причина — до ${OFFER_LIMITS.reasonMax} символов` })
  .max(OFFER_LIMITS.reasonMax * 2, `Причина — до ${OFFER_LIMITS.reasonMax} символов`)
  .transform(oneLine)
  .pipe(z.string().max(OFFER_LIMITS.reasonMax, `Причина — до ${OFFER_LIMITS.reasonMax} символов`))
  .nullish()
  .transform((v) => v || null);

// Published offers the customer can still accept: an offer whose price is no longer binding does not count.
export const openOfferCondition = (now: Date) =>
  and(eq(offers.status, "published"), or(isNull(offers.validUntil), gt(offers.validUntil, now)));

async function publishedCount(db: Db, requestId: string, now: Date) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(offers)
    .where(and(eq(offers.requestId, requestId), openOfferCondition(now)));
  return Number(n);
}

export async function setStatus(
  db: Db,
  actor: Actor,
  id: string,
  status: RequestStatus,
  version: number,
  options: { reason?: string | null } = {},
  deps: SourcingDeps = {},
) {
  assertStaff(actor);
  if (!REQUEST_STATUSES.includes(status)) throw badRequest("Неизвестный статус заявки");
  const reason = parse(ReasonSchema, options.reason);
  const request = await loadForEdit(db, actor, id);
  checkVersion(request, version);
  if (!STATUS_TRANSITIONS[request.status].includes(status))
    throw badRequest(`Заявку нельзя перевести из «${STATUS_NAME[request.status]}» в «${STATUS_NAME[status]}»`, "invalid_transition");
  const now = deps.now ?? new Date();

  const result = await db.transaction(async (tx) => {
    let total = 0;
    if (status === "offered") {
      total = await publishedCount(tx, request.id, now);
      if (!total) throw badRequest("Нет действующих предложений: опубликуйте новое или обновите цену", "no_offers");
    }
    // Closing would also close the chat the customer uses during delivery; the order closes the request when it is delivered.
    if (status === "closed" && request.status === "accepted") {
      const [active] = await tx
        .select({ number: orders.number })
        .from(orders)
        .where(and(eq(orders.requestId, request.id), inArray(orders.status, [...ACTIVE_ORDER_STATUSES])))
        .limit(1);
      if (active)
        throw badRequest(`Заказ №${active.number} ещё в работе. Заявка закроется сама, когда заказ выдадут`, "order_active");
    }
    // Starting the search is taking the request: a search nobody leads would drop out of every queue.
    const claim = status === "searching" && !request.assignedTo ? { assignedTo: actor.id } : {};
    const updated = await bump(tx, request, { status, ...claim }, now);
    // The request is over, so are the offers on the table: the same as when the customer cancels.
    if (status === "cancelled" || status === "closed")
      await tx
        .update(offers)
        .set({ status: "rejected", updatedAt: now })
        .where(and(eq(offers.requestId, request.id), eq(offers.status, "published")));
    let body: string;
    if (status === "searching") {
      body =
        request.status === "new"
          ? TAKEN_MESSAGE
          : request.status === "offered"
            ? "Подборщик ищет другие варианты."
            : "Подборщик продолжил поиск.";
    } else {
      body = STATUS_MESSAGE[status] ?? `Статус заявки: ${STATUS_NAME[status]}.`;
    }
    if (reason) body += `\nПричина: ${reason}`;
    await tx.insert(requestMessages).values({ requestId: request.id, authorId: actor.id, kind: "system", body, createdAt: now });
    return { updated, total };
  });

  const event: NotificationEvent | null =
    status === "clarification"
      ? { type: "request_clarification", requestNumber: request.number, question: reason ?? "" }
      : status === "offered"
        ? { type: "request_offered", requestNumber: request.number, offerCount: result.total }
        : status === "cancelled"
          ? { type: "request_cancelled", requestNumber: request.number, reason }
          : status === "closed"
            ? { type: "request_closed", requestNumber: request.number, reason }
            : null;
  if (event) await notifyCustomer(db, request.customerId, event, deps);
  return result.updated;
}

// Delivered after the response: a slow Telegram must not hold up the sourcer's screen.
const notifyCustomer = (db: Db, customerId: string, event: NotificationEvent, deps: SourcingDeps) =>
  notifyAfterResponse(() => notifyUser(db, customerId, event, deps.notify));

// ---------------------------------------------------------------------------------------------------------------------
// Conversation

export async function askClarification(db: Db, actor: Actor, id: string, question: string, version: number, deps: SourcingDeps = {}) {
  assertStaff(actor);
  const { body } = parse(MessageSchema, { body: question });
  const request = await loadForEdit(db, actor, id);
  checkVersion(request, version);
  if (!CLARIFIABLE_STATUSES.includes(request.status))
    throw badRequest(
      request.status === "offered"
        ? "Клиент выбирает из предложений. Напишите сообщение или верните заявку в поиск"
        : "Заявка закрыта для вопросов. Обновите страницу",
      "invalid_transition",
    );
  const now = deps.now ?? new Date();
  const result = await db.transaction(async (tx) => {
    const updated = await bump(tx, request, { status: "clarification", assignedTo: request.assignedTo ?? actor.id }, now);
    const [message] = await tx
      .insert(requestMessages)
      .values({ requestId: request.id, authorId: actor.id, kind: "message", body, createdAt: now })
      .returning({ id: requestMessages.id });
    return { ...updated, messageId: message.id };
  });
  await notifyCustomer(db, request.customerId, { type: "request_clarification", requestNumber: request.number, question: body }, deps);
  return result;
}

// A message the customer sees, without changing the status (payment details, a photo request, an answer).
export async function sendCustomerMessage(db: Db, actor: Actor, id: string, text: string, deps: SourcingDeps = {}) {
  assertStaff(actor);
  const { body } = parse(MessageSchema, { body: text });
  const request = await loadForEdit(db, actor, id);
  if (!requestChatOpen(request.status, request.status === "closed" ? await requestFitFeedback(db, request.id) : null))
    throw badRequest("Заявка закрыта: клиент её уже не читает. Оставьте внутреннюю заметку");
  const now = deps.now ?? new Date();
  const message = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(requestMessages)
      .values({ requestId: request.id, authorId: actor.id, kind: "message", body, createdAt: now })
      .returning({ id: requestMessages.id, createdAt: requestMessages.createdAt });
    await tx.update(partRequests).set({ updatedAt: now }).where(eq(partRequests.id, request.id));
    return row;
  });
  await notifyCustomer(db, request.customerId, { type: "request_message", requestNumber: request.number, body }, deps);
  return message;
}

// Staff-only note: never shown to the customer (customerMessages drops internal rows).
export async function addInternalNote(db: Db, actor: Actor, id: string, text: string, deps: SourcingDeps = {}) {
  assertStaff(actor);
  const { body } = parse(MessageSchema, { body: text });
  const request = await loadForEdit(db, actor, id);
  const [message] = await db
    .insert(requestMessages)
    .values({ requestId: request.id, authorId: actor.id, kind: "message", internal: true, body, createdAt: deps.now ?? new Date() })
    .returning({ id: requestMessages.id, createdAt: requestMessages.createdAt });
  return message;
}

// ---------------------------------------------------------------------------------------------------------------------
// Offers

const lineText = (max: number, message: string) =>
  z
    .string({ invalid_type_error: message })
    .max(max * 2, message)
    .transform(oneLine)
    .pipe(z.string().max(max, message));

const optionalLine = (max: number, message: string) =>
  lineText(max, message)
    .nullish()
    .transform((v) => v || null);

const optionalText = (max: number, message: string) =>
  z
    .string({ invalid_type_error: message })
    .max(max * 2, message)
    .transform((s) => stripControls(s).trim())
    .pipe(z.string().max(max, message))
    .nullish()
    .transform((v) => v || null);

const isBlank = (value: unknown) => value === null || value === undefined || (typeof value === "string" && !value.trim());

// "1 234,5" → "1234.50", ready for the numeric(12,2) column. Empty means "no yuan price".
const priceCnyInput = z
  .union([z.string(), z.number()], { errorMap: () => ({ message: PRICING_MESSAGES.priceCny }) })
  .nullish()
  .transform((value, ctx) => {
    if (isBlank(value)) return null;
    const fen = parseCnyToFen(value);
    if (fen === null || fen <= 0 || fen > LIMITS.priceCny * 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PRICING_MESSAGES.priceCny });
      return z.NEVER;
    }
    return fenToCnyString(fen);
  });

// Kilograms per unit; "0,35" is accepted. Empty means "not given", never 0.
const weightInput = z
  .union([z.string(), z.number()], { errorMap: () => ({ message: PRICING_MESSAGES.weightKg }) })
  .nullish()
  .transform((value, ctx) => {
    if (isBlank(value)) return null;
    const grams = toScaled(value, 3);
    if (grams === null || grams > LIMITS.weightKg * 1000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: PRICING_MESSAGES.weightKg });
      return z.NEVER;
    }
    return grams / 1000;
  });

const qtyInput = z
  .number({ invalid_type_error: PRICING_MESSAGES.qty, required_error: PRICING_MESSAGES.qty })
  .int(PRICING_MESSAGES.qty)
  .min(1, PRICING_MESSAGES.qty)
  .max(LIMITS.qty, PRICING_MESSAGES.qty);

const supplierUrlInput = z
  .string({ invalid_type_error: OFFER_MESSAGES.supplierUrl })
  .max(OFFER_LIMITS.supplierUrlMax * 2, OFFER_MESSAGES.supplierUrl)
  .nullish()
  .transform((value, ctx) => {
    const text = String(value ?? "").trim();
    if (!text) return null;
    let url: URL | null = null;
    try {
      url = new URL(text);
    } catch {
      url = null;
    }
    // Only web links: a javascript: or data: link in the editor would run when a colleague clicks it.
    if (!url || (url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.href.length > OFFER_LIMITS.supplierUrlMax) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: OFFER_MESSAGES.supplierUrl });
      return z.NEVER;
    }
    return url.href;
  });

const leadDays = z.number({ invalid_type_error: LEAD_TIME_MESSAGES.range, required_error: LEAD_TIME_MESSAGES.range });

export const OfferInputSchema = z
  .object({
    title: z
      .string({ required_error: OFFER_MESSAGES.title, invalid_type_error: OFFER_MESSAGES.title })
      .max(OFFER_LIMITS.titleMax * 2, OFFER_MESSAGES.title)
      .transform(oneLine)
      .pipe(z.string().min(OFFER_LIMITS.titleMin, OFFER_MESSAGES.title).max(OFFER_LIMITS.titleMax, OFFER_MESSAGES.title)),
    oe: z.string({ invalid_type_error: "Номер OE — строка" }).max(200, "Номер OE длиннее 40 символов").nullish(),
    manufacturer: optionalLine(OFFER_LIMITS.manufacturerMax, OFFER_MESSAGES.manufacturer),
    kind: z.enum(OFFER_KINDS, { errorMap: () => ({ message: OFFER_MESSAGES.kind }) }),
    condition: optionalLine(OFFER_LIMITS.conditionMax, OFFER_MESSAGES.condition),
    qty: qtyInput.default(1),
    priceCny: priceCnyInput,
    weightKg: weightInput,
    priceKzt: z
      .number({ invalid_type_error: OFFER_MESSAGES.priceKzt })
      .int(OFFER_MESSAGES.priceKzt)
      .positive(OFFER_MESSAGES.priceKzt)
      .max(LIMITS.priceKzt, OFFER_MESSAGES.priceKzt)
      .nullish()
      .transform((v) => v ?? null),
    leadDaysMin: leadDays,
    leadDaysMax: leadDays,
    fitment: z.enum(FITMENT_LEVELS, { errorMap: () => ({ message: OFFER_MESSAGES.fitment }) }),
    note: optionalText(OFFER_LIMITS.noteMax, OFFER_MESSAGES.note),
    supplierName: optionalLine(OFFER_LIMITS.supplierNameMax, OFFER_MESSAGES.supplierName),
    supplierUrl: supplierUrlInput,
    internalNote: optionalText(OFFER_LIMITS.internalNoteMax, OFFER_MESSAGES.internalNote),
    validDays: z
      .number({ invalid_type_error: OFFER_MESSAGES.validDays })
      .int(OFFER_MESSAGES.validDays)
      .min(OFFER_LIMITS.validDaysMin, OFFER_MESSAGES.validDays)
      .max(OFFER_LIMITS.validDaysMax, OFFER_MESSAGES.validDays)
      .nullish()
      .transform((v) => v ?? OFFER_LIMITS.validDaysDefault),
    forceBelowCost: z
      .boolean()
      .nullish()
      .transform((v) => v === true),
  })
  .superRefine((value, ctx) => {
    const message = validateLeadTime(value.leadDaysMin, value.leadDaysMax);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: ["leadDaysMin"] });
  });
export type OfferInput = z.input<typeof OfferInputSchema>;
type OfferData = z.output<typeof OfferInputSchema>;

export const QuotePreviewSchema = z.object({ priceCny: priceCnyInput, qty: qtyInput.default(1), weightKg: weightInput });
export type QuotePreviewInput = z.input<typeof QuotePreviewSchema>;

type Pricing = { priceCny: string | null; costKzt: number | null; priceKzt: number; quote: Quote | null };

// Yuan price given: cost and the suggested price come from the pricing settings, and the sourcer may set their own
// price on top. Without a yuan price the sourcer sets the tenge price directly and there is no known cost.
async function priceOffer(db: Db, data: OfferData, now: Date, existing?: OfferRow): Promise<Pricing> {
  if (data.priceCny) {
    if (data.weightKg === null) {
      // offers has no weight column: an edit that keeps the yuan price and quantity keeps the computed cost, but only
      // while that cost is current. Re-saving an expired draft must recompute it, or the "price expired" guard on
      // publishing would only move the date while the price stays at the old rate.
      if (existing && existing.priceCny === data.priceCny && existing.qty === data.qty && existing.costKzt != null) {
        if (savedCostReusable(existing, await pricingSettingsChangedAt(db), now))
          return { priceCny: data.priceCny, costKzt: existing.costKzt, priceKzt: data.priceKzt ?? existing.priceKzt, quote: null };
        throw badRequest(OFFER_MESSAGES.staleCost, "weight_required");
      }
      throw badRequest(OFFER_MESSAGES.needWeight, "weight_required");
    }
    const settings = await getPricingSettings(db);
    const quote = computeQuote({ ...settings, priceCny: data.priceCny, qty: data.qty, weightKg: data.weightKg });
    return { priceCny: data.priceCny, costKzt: quote.costKzt, priceKzt: data.priceKzt ?? quote.priceKzt, quote };
  }
  if (data.priceKzt === null) throw badRequest(OFFER_MESSAGES.needPrice, "price_required");
  return { priceCny: null, costKzt: null, priceKzt: data.priceKzt, quote: null };
}

function assertPriceCoversCost(pricing: Pricing, force: boolean) {
  if (pricing.costKzt === null || force || pricing.priceKzt >= pricing.costKzt) return;
  throw badRequest(
    `Цена ${formatKzt(pricing.priceKzt)} ниже себестоимости ${formatKzt(pricing.costKzt)}. Поднимите цену или отметьте «Продать ниже себестоимости»`,
    "below_cost",
  );
}

async function assertFitment(db: Db, request: RequestRow, fitment: FitmentLevel, oe: string | null) {
  if (fitment !== "vin_confirmed") return;
  if (!fitmentOeKey(oe)) throw badRequest(OFFER_MESSAGES.vinConfirmedOe, "fitment_needs_oe");
  const vehicle = await loadVehicle(db, request);
  if (!vinConfirmableFor(vehicle, readSnapshot(request.vehicleSnapshot)))
    throw badRequest(OFFER_MESSAGES.vinConfirmed, "fitment_not_confirmable");
}

function assertOffersEditable(request: RequestRow) {
  if (!OFFER_EDITABLE_STATUSES.includes(request.status))
    throw badRequest(
      request.status === "accepted" ? "Клиент уже выбрал предложение. Новые варианты не нужны" : "Заявка закрыта. Предложения больше не принимаются",
      "request_closed",
    );
}

function offerColumns(data: OfferData, oe: string | null, pricing: Pricing, now: Date) {
  return {
    title: data.title,
    oe,
    manufacturer: data.manufacturer,
    kind: data.kind,
    condition: data.condition,
    qty: data.qty,
    priceKzt: pricing.priceKzt,
    leadDaysMin: data.leadDaysMin,
    leadDaysMax: data.leadDaysMax,
    fitment: data.fitment,
    note: data.note,
    priceCny: pricing.priceCny,
    costKzt: pricing.costKzt,
    supplierName: data.supplierName,
    supplierUrl: data.supplierUrl,
    internalNote: data.internalNote,
    validUntil: addDays(now, data.validDays),
    updatedAt: now,
  };
}

async function loadOfferForEdit(db: Db, actor: Actor, offerId: string) {
  assertStaff(actor);
  if (!isUuid(offerId)) throw notFound("Предложение не найдено");
  const [row] = await db
    .select({ offer: offers, request: partRequests })
    .from(offers)
    .innerJoin(partRequests, eq(partRequests.id, offers.requestId))
    .where(eq(offers.id, offerId))
    .limit(1);
  if (!row) throw notFound("Предложение не найдено");
  assertStaffCanEdit(actor, row.request);
  return row;
}

export async function createOffer(db: Db, actor: Actor, requestId: string, input: OfferInput, deps: SourcingDeps = {}) {
  assertStaff(actor);
  const data = parse(OfferInputSchema, input);
  const request = await loadForEdit(db, actor, requestId);
  assertOffersEditable(request);
  const oe = normalizeRequestOe(data.oe);
  await assertFitment(db, request, data.fitment, oe);
  const now = deps.now ?? new Date();
  const pricing = await priceOffer(db, data, now);
  assertPriceCoversCost(pricing, data.forceBelowCost);
  const [row] = await db
    .insert(offers)
    .values({ requestId: request.id, createdBy: actor.id, status: "draft", ...offerColumns(data, oe, pricing, now), createdAt: now })
    .returning();
  return { offer: staffOffer(row, { pricingChangedAt: null, now }), quote: pricing.quote };
}

export async function updateOffer(db: Db, actor: Actor, offerId: string, input: OfferInput, deps: SourcingDeps = {}) {
  assertStaff(actor);
  const data = parse(OfferInputSchema, input);
  const { offer, request } = await loadOfferForEdit(db, actor, offerId);
  if (offer.status !== "draft") throw conflict("Изменить можно только черновик. Отзовите предложение и добавьте новое");
  assertOffersEditable(request);
  const oe = normalizeRequestOe(data.oe);
  await assertFitment(db, request, data.fitment, oe);
  const now = deps.now ?? new Date();
  const pricing = await priceOffer(db, data, now, offer);
  assertPriceCoversCost(pricing, data.forceBelowCost);
  const [row] = await db
    .update(offers)
    .set(offerColumns(data, oe, pricing, now))
    .where(and(eq(offers.id, offer.id), eq(offers.status, "draft")))
    .returning();
  if (!row) throw conflict("Черновик уже опубликован или удалён. Обновите страницу");
  return { offer: staffOffer(row, { pricingChangedAt: null, now }), quote: pricing.quote };
}

export async function deleteOffer(db: Db, actor: Actor, offerId: string) {
  const { offer } = await loadOfferForEdit(db, actor, offerId);
  if (offer.status !== "draft") throw conflict("Удалить можно только черновик. Опубликованное предложение можно отозвать");
  const deleted = await db
    .delete(offers)
    .where(and(eq(offers.id, offer.id), eq(offers.status, "draft")))
    .returning({ id: offers.id });
  if (!deleted.length) throw conflict("Черновик уже опубликован или удалён. Обновите страницу");
  return { id: offer.id };
}

// Same lock order as acceptOffer (request row first), so a withdraw and a customer's accept never both win.
export async function withdrawOffer(db: Db, actor: Actor, offerId: string, deps: SourcingDeps = {}) {
  const { offer } = await loadOfferForEdit(db, actor, offerId);
  if (offer.status === "accepted") throw conflict("Клиент уже выбрал это предложение — отозвать нельзя");
  if (offer.status !== "published") throw conflict("Отозвать можно только опубликованное предложение");
  const now = deps.now ?? new Date();
  return db.transaction(async (tx) => {
    const [request] = await tx.select().from(partRequests).where(eq(partRequests.id, offer.requestId)).for("update");
    if (!request) throw notFound("Предложение не найдено");
    assertStaffCanEdit(actor, request);
    const changed = await tx
      .update(offers)
      .set({ status: "withdrawn", updatedAt: now })
      .where(and(eq(offers.id, offer.id), eq(offers.status, "published")))
      .returning({ id: offers.id });
    if (!changed.length) throw conflict("Предложение изменилось: возможно, клиент уже выбрал его. Обновите страницу");
    // Nothing left to choose from (expired offers cannot be chosen either): the request goes back to the search.
    const empty = request.status === "offered" && (await publishedCount(tx, request.id, now)) === 0;
    let updated: RequestChange;
    if (empty) {
      updated = await bump(tx, request, { status: "searching" }, now);
    } else {
      await tx.update(partRequests).set({ updatedAt: now }).where(eq(partRequests.id, request.id));
      updated = { ...changeOf(request), updatedAt: now };
    }
    await tx.insert(requestMessages).values({
      requestId: request.id,
      authorId: actor.id,
      kind: "system",
      body: empty
        ? `Предложение «${offer.title}» больше недоступно. Подборщик ищет другие варианты.`
        : `Предложение «${offer.title}» больше недоступно.`,
      createdAt: now,
    });
    return { offerId: offer.id, offerStatus: "withdrawn" as const, request: updated };
  });
}

export async function previewQuote(db: Db, actor: Actor, input: QuotePreviewInput) {
  assertStaff(actor);
  const data = parse(QuotePreviewSchema, input);
  if (!data.priceCny) throw badRequest(PRICING_MESSAGES.priceCny, "invalid_quote");
  if (data.weightKg === null) throw badRequest(OFFER_MESSAGES.needWeight, "weight_required");
  const settings = await getPricingSettings(db);
  const quote = computeQuote({ ...settings, priceCny: data.priceCny, qty: data.qty, weightKg: data.weightKg });
  return { ...quote, cnyRate: settings.cnyRate, cnyRateDate: settings.cnyRateDate };
}
export type QuotePreview = Awaited<ReturnType<typeof previewQuote>>;

export async function publishOffers(db: Db, actor: Actor, requestId: string, version: number, deps: SourcingDeps = {}) {
  const request = await loadForEdit(db, actor, requestId);
  checkVersion(request, version);
  if (!PUBLISHABLE_STATUSES.includes(request.status))
    throw badRequest(
      request.status === "new"
        ? "Сначала возьмите заявку в работу"
        : request.status === "clarification"
          ? "Заявка ждёт ответа клиента. Верните её в поиск, чтобы опубликовать предложения"
          : "Заявка закрыта. Предложения больше не публикуются",
      "invalid_transition",
    );
  const now = deps.now ?? new Date();
  const result = await db.transaction(async (tx) => {
    const updated = await bump(tx, request, { status: "offered", assignedTo: request.assignedTo ?? actor.id }, now);
    const drafts = await tx
      .select({ id: offers.id, title: offers.title, validUntil: offers.validUntil, fitment: offers.fitment, oe: offers.oe })
      .from(offers)
      .where(and(eq(offers.requestId, request.id), eq(offers.status, "draft")))
      .orderBy(asc(offers.createdAt));
    if (!drafts.length) throw badRequest("Нет черновиков для публикации. Сначала добавьте предложение", "no_drafts");
    const stale = drafts.find((d) => !d.validUntil || d.validUntil.getTime() <= now.getTime());
    if (stale)
      throw badRequest(
        `Цена в черновике «${stale.title}» устарела: курс юаня мог измениться. Откройте черновик, укажите вес и сохраните — цена пересчитается`,
        "draft_expired",
      );
    // "Подходит по VIN" is checked again: since the draft was saved the owner may have cleared their trim.
    const confirmed = drafts.filter((d) => d.fitment === "vin_confirmed");
    if (confirmed.length) {
      const vehicle = await loadVehicle(tx, request);
      const snapshot = readSnapshot(request.vehicleSnapshot);
      const unconfirmed = confirmed.find((d) => !vinConfirmedOfferOk(d.oe, vehicle, snapshot));
      if (unconfirmed)
        throw badRequest(
          `В черновике «${unconfirmed.title}» отмечено «Подходит по VIN», но подтвердить это уже нельзя: комплектация не выбрана, каталог по VIN не открывается или нет номера OE. Измените совместимость в черновике`,
          "fitment_not_confirmable",
        );
    }
    const published = await tx
      .update(offers)
      .set({ status: "published", updatedAt: now })
      .where(and(eq(offers.requestId, request.id), eq(offers.status, "draft")))
      .returning({ id: offers.id });
    await tx.insert(requestMessages).values({
      requestId: request.id,
      authorId: actor.id,
      kind: "system",
      body: `Подборщик прислал варианты: ${published.length}`,
      createdAt: now,
    });
    return { request: updated, published: published.length, total: await publishedCount(tx, request.id, now) };
  });
  await notifyCustomer(db, request.customerId, { type: "request_offered", requestNumber: request.number, offerCount: result.total }, deps);
  return { ...result.request, published: result.published };
}
