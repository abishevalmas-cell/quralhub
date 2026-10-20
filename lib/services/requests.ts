import { and, asc, count, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { isStaff, type Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import {
  attachments,
  offers,
  orders,
  partRequests,
  requestMessages,
  users,
  vehicles,
  type DecodeStatus,
  type RequestStatus,
} from "@/lib/db/schema";
import { notifyAfterResponse, notifyStaff, notifyUser, type NotificationEvent, type NotifyDeps } from "@/lib/notify";
import { normalizeOe } from "@/lib/providers";
import { badRequest, conflict, notFound, tooMany } from "@/lib/server/errors";
import { getStorage, newStorageKey, type Storage } from "@/lib/storage";
import { IMAGE_MIMES, validateImageUpload } from "@/lib/storage/images";
import { getPartType, parseQuery } from "@/lib/taxonomy";
import { brandModel } from "@/lib/utils";
import { hasValidCheckDigit, VIN_CHARSET } from "@/lib/vin";
import { assertStaffCanEdit, isUuid, loadRequestForActor, loadVehicleForOwner } from "./access";
import { customerMessages, customerOffer, customerVisibleOfferStatuses } from "./visibility";

export const REQUEST_LIMITS = {
  titleMin: 2,
  titleMax: 160,
  descriptionMax: 4000,
  oeMax: 40,
  qtyMin: 1,
  qtyMax: 50,
  messageMax: 3000,
  attachmentsMax: 10,
} as const;

// Per-account limits over the last 24 hours. Every new request notifies the whole team and every photo takes disk
// space, so one account (or a stolen session) must not be able to flood either. Staff are not limited.
export const DAILY_LIMITS = {
  requests: { customer: 20, master: 60 },
  uploadBytes: { customer: 150 * 1024 * 1024, master: 400 * 1024 * 1024 },
} as const;

const DAY_MS = 24 * 3600 * 1000;
const dailyTier = (actor: Actor) => (actor.role === "master" ? "master" : "customer");

async function assertRequestBudget(db: Db, actor: Actor, now: Date) {
  if (isStaff(actor)) return;
  const [{ n }] = await db
    .select({ n: count() })
    .from(partRequests)
    .where(and(eq(partRequests.customerId, actor.id), gt(partRequests.createdAt, new Date(now.getTime() - DAY_MS))));
  if (Number(n) >= DAILY_LIMITS.requests[dailyTier(actor)])
    throw tooMany("Сегодня вы уже создали много заявок. Допишите детали в открытые заявки или продолжите завтра");
}

async function assertUploadBudget(db: Db, actor: Actor, size: number, now: Date) {
  if (isStaff(actor)) return;
  const [{ total }] = await db
    .select({ total: sql<number>`coalesce(sum(${attachments.size}), 0)` })
    .from(attachments)
    .where(and(eq(attachments.uploaderId, actor.id), gt(attachments.createdAt, new Date(now.getTime() - DAY_MS))));
  if (Number(total) + size > DAILY_LIMITS.uploadBytes[dailyTier(actor)])
    throw tooMany("Сегодня вы уже загрузили много фото. Продолжите завтра или опишите деталь в чате");
}

export const RECEIVED_MESSAGE = "Заявка получена. Подборщик ответит в рабочее время.";

// The customer may cancel while nobody has bought anything yet.
export const CANCELLABLE_STATUSES: readonly RequestStatus[] = ["new", "clarification", "searching", "offered"];
// Closed and cancelled requests take no new messages or photos: nobody is watching them any more.
const FINISHED_STATUSES: readonly RequestStatus[] = ["closed", "cancelled"];

// A closed request keeps its chat while a delivered part did not fit: the return is arranged there.
export const requestChatOpen = (status: RequestStatus, fitFeedback: string | null | undefined) =>
  !FINISHED_STATUSES.includes(status) || (status === "closed" && fitFeedback === "not_fits");

export async function requestFitFeedback(db: Db, requestId: string): Promise<string | null> {
  const [row] = await db
    .select({ fitFeedback: orders.fitFeedback })
    .from(orders)
    .where(and(eq(orders.requestId, requestId), eq(orders.fitFeedback, "not_fits")))
    .limit(1);
  return row?.fitFeedback ?? null;
}

export type RequestDeps = { notify?: NotifyDeps; now?: Date };
export type AttachmentDeps = { storage?: Storage; now?: Date };

// ---------------------------------------------------------------------------------------------------------------------
// Vehicle snapshot

export type VehicleSnapshot = {
  label: string;
  vin: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
  decodeStatus: DecodeStatus | null;
  epc: string | null;
};

type VehicleRow = typeof vehicles.$inferSelect;

export function vehicleLabel(v: Pick<VehicleRow, "label" | "brand" | "model" | "year">): string {
  const custom = v.label?.trim();
  if (custom) return custom;
  const parts = [brandModel(v.brand, v.model), v.year ? String(v.year) : null].filter((p): p is string => Boolean(p && p.trim()));
  return parts.length ? parts.join(" ") : "Машина без названия";
}

export function snapshotOf(v: VehicleRow): VehicleSnapshot {
  return {
    label: vehicleLabel(v),
    vin: v.vin,
    brand: v.brand,
    model: v.model,
    year: v.year,
    trim: v.trim,
    decodeStatus: v.decodeStatus,
    epc: v.epc,
  };
}

const str = (value: unknown) => (typeof value === "string" && value ? value : null);

// The snapshot is jsonb: read it field by field so a malformed row cannot break the page.
export function readSnapshot(raw: unknown): VehicleSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  return {
    label: str(s.label) ?? "Машина без названия",
    vin: str(s.vin),
    brand: str(s.brand),
    model: str(s.model),
    year: typeof s.year === "number" && Number.isInteger(s.year) ? s.year : null,
    trim: str(s.trim),
    decodeStatus: str(s.decodeStatus) as DecodeStatus | null,
    epc: str(s.epc),
  };
}

// For the vehicle select on the new request form.
export async function listVehicleOptions(db: Db, actor: Actor) {
  const rows = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.ownerId, actor.id), isNull(vehicles.archivedAt)))
    .orderBy(desc(vehicles.updatedAt));
  return rows.map((v) => ({ id: v.id, label: vehicleLabel(v) }));
}

// ---------------------------------------------------------------------------------------------------------------------
// Validation

const MESSAGES = {
  title: `Опишите, что нужно: от ${REQUEST_LIMITS.titleMin} до ${REQUEST_LIMITS.titleMax} символов`,
  description: `Описание длиннее ${REQUEST_LIMITS.descriptionMax} символов. Сократите его`,
  oeLength: `Номер OE длиннее ${REQUEST_LIMITS.oeMax} символов`,
  oeChars: "Номер OE: латинские буквы, цифры, пробел, дефис, точка или слеш",
  oeIsVin: "Это похоже на VIN. Выберите машину из гаража, а в поле OE укажите номер детали",
  qty: `Количество — от ${REQUEST_LIMITS.qtyMin} до ${REQUEST_LIMITS.qtyMax}`,
  partType: "Неизвестный тип детали. Выберите деталь из подсказки или оставьте поле пустым",
  message: `Сообщение — от 1 до ${REQUEST_LIMITS.messageMax} символов`,
} as const;

// Control characters other than line breaks and tabs only break rendering and notifications.
const stripControls = (s: string) => s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
const oneLine = (s: string) => stripControls(s).replace(/\s+/g, " ").trim();

const OE_CHARS = /^[A-Z0-9][A-Z0-9 ._/-]*$/;

// OE numbers are uppercase in Chinese catalogs. Empty means "not known", which is normal.
export function normalizeRequestOe(raw: string | null | undefined): string | null {
  const oe = String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
  if (!oe) return null;
  if (oe.length > REQUEST_LIMITS.oeMax) throw badRequest(MESSAGES.oeLength);
  if (!OE_CHARS.test(oe)) throw badRequest(MESSAGES.oeChars);
  // A VIN in the OE field would end up in places that do not mask it.
  const compact = normalizeOe(oe);
  if (compact.length === 17 && VIN_CHARSET.test(compact) && hasValidCheckDigit(compact)) throw badRequest(MESSAGES.oeIsVin);
  return oe;
}

export const CreateRequestSchema = z.object({
  vehicleId: z.string().max(64).nullish(),
  title: z
    .string({ required_error: MESSAGES.title, invalid_type_error: MESSAGES.title })
    .transform(oneLine)
    .pipe(z.string().min(REQUEST_LIMITS.titleMin, MESSAGES.title).max(REQUEST_LIMITS.titleMax, MESSAGES.title)),
  description: z
    .string()
    .max(REQUEST_LIMITS.descriptionMax * 2, MESSAGES.description)
    .transform((s) => stripControls(s).trim())
    .pipe(z.string().max(REQUEST_LIMITS.descriptionMax, MESSAGES.description))
    .default(""),
  partTypeId: z.string().max(80).nullish(),
  axis: z.enum(["front", "rear"]).nullish(),
  side: z.enum(["left", "right"]).nullish(),
  oe: z.string().max(200, MESSAGES.oeLength).nullish(),
  qty: z
    .number({ invalid_type_error: MESSAGES.qty })
    .int(MESSAGES.qty)
    .min(REQUEST_LIMITS.qtyMin, MESSAGES.qty)
    .max(REQUEST_LIMITS.qtyMax, MESSAGES.qty)
    .default(1),
});
export type CreateRequestInput = z.input<typeof CreateRequestSchema>;

export const MessageSchema = z.object({
  body: z
    .string({ required_error: MESSAGES.message, invalid_type_error: MESSAGES.message })
    .max(REQUEST_LIMITS.messageMax * 2, MESSAGES.message)
    .transform((s) => stripControls(s).trim())
    .pipe(z.string().min(1, MESSAGES.message).max(REQUEST_LIMITS.messageMax, MESSAGES.message)),
});
export type MessageInput = z.input<typeof MessageSchema>;

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const message = result.error.issues[0]?.message;
    throw badRequest(message && !message.startsWith("Expected") && !message.startsWith("Required") ? message : "Проверьте заполнение формы");
  }
  return result.data;
}

// Follow-ups go to the sourcer who leads the request while they are still on the team; while nobody does (or the
// assignee lost their staff role), every staff member gets them. Delivery runs after the response.
export async function notifyRequestStaff(
  db: Db,
  request: { assignedTo: string | null },
  event: NotificationEvent,
  deps: NotifyDeps = {},
) {
  await notifyAfterResponse(async () => {
    const assignee = request.assignedTo
      ? (await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, request.assignedTo)).limit(1))[0]
      : undefined;
    if (assignee && isStaff(assignee)) await notifyUser(db, assignee.id, event, deps);
    else await notifyStaff(db, event, deps);
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Customer actions

export async function createRequest(db: Db, actor: Actor, input: CreateRequestInput, deps: RequestDeps = {}) {
  const data = parse(CreateRequestSchema, input);
  const vehicle = data.vehicleId ? await loadVehicleForOwner(db, actor, data.vehicleId) : null;
  await assertRequestBudget(db, actor, deps.now ?? new Date());
  const partTypeId = data.partTypeId ? data.partTypeId.trim() : null;
  if (partTypeId && !getPartType(partTypeId)) throw badRequest(MESSAGES.partType);
  const oe = normalizeRequestOe(data.oe);

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(partRequests)
      .values({
        customerId: actor.id,
        vehicleId: vehicle?.id ?? null,
        status: "new",
        title: data.title,
        description: data.description,
        partTypeId: partTypeId || null,
        axis: data.axis ?? null,
        side: data.side ?? null,
        oe,
        qty: data.qty,
        vehicleSnapshot: vehicle ? snapshotOf(vehicle) : null,
      })
      .returning({ id: partRequests.id, number: partRequests.number });
    await tx.insert(requestMessages).values({ requestId: row.id, kind: "system", body: RECEIVED_MESSAGE });
    return row;
  });

  await notifyAfterResponse(async () => {
    await notifyStaff(
      db,
      {
        type: "staff_new_request",
        requestNumber: created.number,
        vehicleLabel: vehicle ? vehicleLabel(vehicle) : null,
        title: data.title,
      },
      deps.notify,
    );
    await notifyUser(db, actor.id, { type: "request_received", requestNumber: created.number }, deps.notify);
  });
  return created;
}

export async function listMyRequests(db: Db, actor: Actor, deps: { now?: Date } = {}) {
  const now = deps.now ?? new Date();
  const rows = await db
    .select({
      id: partRequests.id,
      number: partRequests.number,
      title: partRequests.title,
      status: partRequests.status,
      vehicleSnapshot: partRequests.vehicleSnapshot,
      updatedAt: partRequests.updatedAt,
    })
    .from(partRequests)
    .where(eq(partRequests.customerId, actor.id))
    .orderBy(desc(partRequests.updatedAt), desc(partRequests.number))
    .limit(200);
  const ids = rows.map((r) => r.id);
  const counts = ids.length
    ? await db
        .select({ requestId: offers.requestId, n: count() })
        .from(offers)
        // Only offers the customer can still accept: an expired price is not something to choose from.
        .where(
          and(
            inArray(offers.requestId, ids),
            eq(offers.status, "published"),
            or(isNull(offers.validUntil), gt(offers.validUntil, now)),
          ),
        )
        .groupBy(offers.requestId)
    : [];
  const byRequest = new Map(counts.map((c) => [c.requestId, Number(c.n)]));
  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    status: r.status,
    vehicleLabel: readSnapshot(r.vehicleSnapshot)?.label ?? null,
    offerCount: byRequest.get(r.id) ?? 0,
    updatedAt: r.updatedAt,
  }));
}
export type MyRequestItem = Awaited<ReturnType<typeof listMyRequests>>[number];

const OFFER_ORDER: Partial<Record<string, number>> = { accepted: 0, published: 1, rejected: 2 };

const MAX_SERIAL = 2_147_483_647;

// Pages take the request id; notification links carry the request number (/requests/42), so both resolve.
function requestRef(ref: string) {
  const value = String(ref ?? "").trim();
  if (isUuid(value)) return eq(partRequests.id, value);
  if (/^\d{1,10}$/.test(value) && Number(value) > 0 && Number(value) <= MAX_SERIAL) return eq(partRequests.number, Number(value));
  throw notFound("Заявка не найдена");
}

// Customers see only their own requests here; staff work through the sourcer views.
async function loadOwnRequest(db: Db, actor: Actor, ref: string) {
  const [row] = await db.select().from(partRequests).where(requestRef(ref)).limit(1);
  if (!row || row.customerId !== actor.id) throw notFound("Заявка не найдена");
  return row;
}

export async function getRequestForCustomer(db: Db, actor: Actor, id: string) {
  const request = await loadOwnRequest(db, actor, id);
  const [messageRows, attachmentRows, offerRows, orderRows] = await Promise.all([
    db
      .select()
      .from(requestMessages)
      .where(eq(requestMessages.requestId, request.id))
      .orderBy(asc(requestMessages.createdAt), asc(requestMessages.id)),
    db
      .select({
        id: attachments.id,
        name: attachments.name,
        mime: attachments.mime,
        size: attachments.size,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(eq(attachments.requestId, request.id))
      .orderBy(asc(attachments.createdAt), asc(attachments.id)),
    db.select().from(offers).where(eq(offers.requestId, request.id)).orderBy(asc(offers.createdAt), asc(offers.id)),
    db
      .select({ id: orders.id, number: orders.number, status: orders.status, fitFeedback: orders.fitFeedback })
      .from(orders)
      .where(and(eq(orders.requestId, request.id), eq(orders.customerId, actor.id)))
      .orderBy(desc(orders.createdAt))
      .limit(1),
  ]);
  const partType = getPartType(request.partTypeId);
  return {
    request: {
      id: request.id,
      number: request.number,
      status: request.status,
      title: request.title,
      description: request.description,
      partTypeId: request.partTypeId,
      partName: partType?.ru ?? null,
      axis: request.axis,
      side: request.side,
      oe: request.oe,
      qty: request.qty,
      version: request.version,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    },
    vehicle: readSnapshot(request.vehicleSnapshot),
    // Who wrote what is all the customer needs; staff user ids stay on the server.
    messages: customerMessages(messageRows).map((m) => ({
      id: m.id,
      kind: m.kind,
      from: m.kind === "system" ? ("system" as const) : m.authorId === actor.id ? ("customer" as const) : ("staff" as const),
      body: m.body,
      createdAt: m.createdAt,
    })),
    attachments: attachmentRows,
    // The chosen offer first, then the ones still open, then those that lost.
    offers: offerRows
      .filter((o) => customerVisibleOfferStatuses.has(o.status))
      .sort((a, b) => (OFFER_ORDER[a.status] ?? 9) - (OFFER_ORDER[b.status] ?? 9))
      .map(customerOffer),
    order: orderRows[0] ?? null,
    chatOpen: requestChatOpen(request.status, orderRows[0]?.fitFeedback),
  };
}
export type CustomerRequestView = Awaited<ReturnType<typeof getRequestForCustomer>>;

export async function postCustomerMessage(db: Db, actor: Actor, id: string, input: MessageInput, deps: RequestDeps = {}) {
  const { body } = parse(MessageSchema, input);
  const request = await loadOwnRequest(db, actor, id);
  if (!requestChatOpen(request.status, request.status === "closed" ? await requestFitFeedback(db, request.id) : null))
    throw badRequest("Заявка закрыта. Создайте новую, если деталь всё ещё нужна");
  const answered = request.status === "clarification";
  // The answer sends the request back to the search; with nobody leading it, back to the "new" queue, where any
  // sourcer will see it.
  const nextStatus: RequestStatus = request.assignedTo ? "searching" : "new";
  const now = new Date();

  const message = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(requestMessages)
      .values({ requestId: request.id, authorId: actor.id, kind: "message", body })
      .returning();
    if (answered) {
      const updated = await tx
        .update(partRequests)
        .set({ status: nextStatus, version: request.version + 1, updatedAt: now })
        .where(and(eq(partRequests.id, request.id), eq(partRequests.version, request.version)))
        .returning({ id: partRequests.id });
      if (!updated.length) throw conflict("Заявка изменилась. Обновите страницу и отправьте сообщение ещё раз");
    } else {
      await tx.update(partRequests).set({ updatedAt: now }).where(eq(partRequests.id, request.id));
    }
    return row;
  });

  await notifyRequestStaff(
    db,
    request,
    { type: "staff_customer_reply", requestNumber: request.number, title: request.title, body, answered },
    deps.notify,
  );
  return { id: message.id, status: answered ? nextStatus : request.status };
}

export async function cancelRequest(db: Db, actor: Actor, id: string, version: number, deps: RequestDeps = {}) {
  const request = await loadOwnRequest(db, actor, id);
  if (!Number.isSafeInteger(version)) throw badRequest("Обновите страницу и попробуйте ещё раз");
  if (request.version !== version) throw conflict("Заявка изменилась. Обновите страницу");
  if (!CANCELLABLE_STATUSES.includes(request.status)) throw conflict("Эту заявку уже нельзя отменить");
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const updated = await tx
      .update(partRequests)
      .set({ status: "cancelled", version: version + 1, updatedAt: now })
      .where(
        and(
          eq(partRequests.id, request.id),
          eq(partRequests.version, version),
          inArray(partRequests.status, [...CANCELLABLE_STATUSES]),
        ),
      )
      .returning({ id: partRequests.id, status: partRequests.status, version: partRequests.version });
    if (!updated.length) throw conflict("Заявка изменилась. Обновите страницу");
    // The customer declined everything that was on the table.
    await tx
      .update(offers)
      .set({ status: "rejected", updatedAt: now })
      .where(and(eq(offers.requestId, request.id), eq(offers.status, "published")));
    await tx.insert(requestMessages).values({ requestId: request.id, kind: "system", body: "Клиент отменил заявку." });
    return updated[0];
  });
  // The sourcer who leads it stops searching; an unassigned request simply leaves the queue.
  if (request.assignedTo)
    await notifyRequestStaff(db, request, { type: "staff_request_cancelled", requestNumber: request.number, title: request.title }, deps.notify);
  return result;
}

// ---------------------------------------------------------------------------------------------------------------------
// Photos

export type AttachmentUpload = { bytes: Uint8Array; name?: string | null; declaredMime?: string | null; size: number };

export async function addAttachment(
  db: Db,
  actor: Actor,
  requestId: string,
  upload: AttachmentUpload,
  deps: AttachmentDeps = {},
) {
  const storage = deps.storage ?? getStorage();
  const { request, asStaff } = await loadRequestForActor(db, actor, requestId);
  // Staff add photos like any other change: only to requests they may edit.
  if (asStaff) assertStaffCanEdit(actor, request);
  if (FINISHED_STATUSES.includes(request.status)) throw badRequest("Заявка закрыта. Фото к ней добавить нельзя");
  const checked = validateImageUpload({ bytes: upload.bytes, declaredMime: upload.declaredMime, size: upload.size, name: upload.name });
  if (!checked.ok) throw badRequest(checked.error);
  await assertUploadBudget(db, actor, upload.bytes.byteLength, deps.now ?? new Date());
  const tooMany = () => badRequest(`К заявке можно прикрепить не больше ${REQUEST_LIMITS.attachmentsMax} фото`);
  const [{ n }] = await db.select({ n: count() }).from(attachments).where(eq(attachments.requestId, request.id));
  if (Number(n) >= REQUEST_LIMITS.attachmentsMax) throw tooMany();

  const key = newStorageKey();
  await storage.put(key, upload.bytes, checked.mime);
  try {
    return await db.transaction(async (tx) => {
      // The row lock makes concurrent uploads to one request count one after another.
      await tx.select({ id: partRequests.id }).from(partRequests).where(eq(partRequests.id, request.id)).for("update");
      const [{ n: current }] = await tx.select({ n: count() }).from(attachments).where(eq(attachments.requestId, request.id));
      if (Number(current) >= REQUEST_LIMITS.attachmentsMax) throw tooMany();
      const [row] = await tx
        .insert(attachments)
        .values({
          requestId: request.id,
          uploaderId: actor.id,
          storageKey: key,
          name: checked.name,
          mime: checked.mime,
          size: upload.bytes.byteLength,
        })
        .returning({
          id: attachments.id,
          name: attachments.name,
          mime: attachments.mime,
          size: attachments.size,
          createdAt: attachments.createdAt,
        });
      await tx.update(partRequests).set({ updatedAt: new Date() }).where(eq(partRequests.id, request.id));
      return row;
    });
  } catch (error) {
    await storage.delete(key).catch((e) => console.error("[tetix] orphaned upload cleanup failed", (e as Error)?.message));
    throw error;
  }
}

const SERVABLE = new Set<string>(IMAGE_MIMES);

export async function getAttachmentFile(db: Db, actor: Actor, attachmentId: string, deps: AttachmentDeps = {}) {
  if (!isUuid(attachmentId)) throw notFound("Фото не найдено");
  const [row] = await db.select().from(attachments).where(eq(attachments.id, attachmentId)).limit(1);
  if (!row) throw notFound("Фото не найдено");
  try {
    await loadRequestForActor(db, actor, row.requestId);
  } catch {
    throw notFound("Фото не найдено");
  }
  const stored = await (deps.storage ?? getStorage()).get(row.storageKey);
  if (!stored) throw notFound("Фото не найдено");
  // Only sniffed image types were ever stored; anything else is served as a download, never rendered.
  const mime = SERVABLE.has(row.mime) ? row.mime : "application/octet-stream";
  return { bytes: stored.bytes, mime, name: row.name };
}

// ---------------------------------------------------------------------------------------------------------------------
// Prefill for /requests/new from links on other pages (?vehicle, ?oe, ?title, ?part, ?axis, ?side, ?q)

export type RequestDraft = {
  vehicleId: string | null;
  title: string;
  partTypeId: string | null;
  axis: "front" | "rear" | null;
  side: "left" | "right" | null;
  oe: string;
  // The customer's own words when the title came from a picked part ("колодки передние на сонг плюс").
  description: string;
  // ?photo=1: photos picked on the home page wait in memory to be attached after the request is created.
  withPhotos: boolean;
};

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function requestDraftFromQuery(
  query: Record<string, string | string[] | undefined>,
  vehicleIds: string[] = [],
): RequestDraft {
  const vehicle = first(query.vehicle);
  const part = getPartType(first(query.part).trim());
  const axisRaw = first(query.axis);
  const sideRaw = first(query.side);
  let title = oneLine(first(query.title)).slice(0, REQUEST_LIMITS.titleMax);
  let oe = oneLine(first(query.oe)).toUpperCase().slice(0, REQUEST_LIMITS.oeMax);
  let axis: RequestDraft["axis"] = axisRaw === "front" || axisRaw === "rear" ? axisRaw : null;
  let side: RequestDraft["side"] = sideRaw === "left" || sideRaw === "right" ? sideRaw : null;

  let description = "";
  const q = oneLine(first(query.q)).slice(0, 300);
  if (q) {
    const parsed = parseQuery(q);
    if (!oe && parsed.oe) oe = parsed.oe.slice(0, REQUEST_LIMITS.oeMax);
    // A VIN or an OE number typed into the search box must not end up in the title: parsed.text is the query without them.
    const text = (parsed.kind === "text" ? q : parsed.text).trim();
    if (!title) title = text.slice(0, REQUEST_LIMITS.titleMax).trim();
    else if (text && text.toLowerCase() !== title.toLowerCase()) description = text;
    axis ??= parsed.axis;
    side ??= parsed.side;
  }
  if (!title && part) title = part.ru;
  try {
    if (oe) normalizeRequestOe(oe);
  } catch {
    oe = "";
  }
  return {
    vehicleId: vehicleIds.includes(vehicle) ? vehicle : null,
    title,
    partTypeId: part?.id ?? null,
    axis,
    side,
    oe,
    description,
    withPhotos: first(query.photo) === "1",
  };
}
