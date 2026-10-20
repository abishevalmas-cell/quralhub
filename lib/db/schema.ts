import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Money: tenge is stored as whole integers (₸ has no minor unit in practice), yuan as numeric(12,2).
// Columns marked INTERNAL must never be returned to customers (see lib/services/visibility.ts).

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const USER_ROLES = ["customer", "master", "sourcer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  role: text("role").$type<UserRole>().notNull().default("customer"),
  company: text("company"),
  city: text("city"),
  locale: text("locale").notNull().default("ru"),
  telegramChatId: text("telegram_chat_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_otp_phone").on(t.phone, t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token; the raw token is never stored.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

export const DECODE_STATUSES = ["pending", "decoded", "ambiguous", "unsupported", "error", "manual"] as const;
export type DecodeStatus = (typeof DECODE_STATUSES)[number];

export type VehicleCandidate = {
  id: string;
  brand: string;
  model: string;
  year: string;
  version: string;
  description: string;
  engine: string;
  fuel: string;
  drive: string;
  epcId: string;
  image: string | null;
};

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vin: text("vin"),
    label: text("label"),
    brand: text("brand"),
    model: text("model"),
    year: integer("year"),
    trim: text("trim"),
    epc: text("epc"),
    epcId: text("epc_id"),
    buildDate: text("build_date"),
    decodeStatus: text("decode_status").$type<DecodeStatus>().notNull().default("pending"),
    candidates: jsonb("candidates").$type<VehicleCandidate[]>().notNull().default(sql`'[]'::jsonb`),
    selectedCandidateId: text("selected_candidate_id"),
    // Model of lib/catalog behind the car (illustration and assortment only, never a fitment) and the paint
    // the owner picked from components/car CAR_COLORS. Both null until known.
    modelId: text("model_id"),
    // True when the owner named the model themselves: a later decode or trim choice never overwrites it.
    modelByOwner: boolean("model_by_owner").notNull().default(false),
    color: text("color"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("idx_vehicles_owner").on(t.ownerId),
    uniqueIndex("uq_vehicles_owner_vin").on(t.ownerId, t.vin),
  ],
);

// Shared cache of provider answers per VIN or per catalog node. 17VIN bills a VIN once per 3 months,
// so repeated decodes and catalog reads come from here.
export const providerCache = pgTable("provider_cache", {
  key: text("key").primaryKey(),
  provider: text("provider").notNull(),
  operation: text("operation").notNull(),
  result: jsonb("result").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providerCalls = pgTable(
  "provider_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    operation: text("operation").notNull(),
    mode: text("mode").$type<"live" | "fixture">().notNull(),
    inputMask: text("input_mask").notNull(),
    status: text("status").notNull(),
    providerCode: integer("provider_code"),
    durationMs: integer("duration_ms").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_provider_calls_day").on(t.provider, t.createdAt)],
);

export const REQUEST_STATUSES = [
  "new",
  "clarification",
  "searching",
  "offered",
  "accepted",
  "closed",
  "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const partRequests = pgTable(
  "part_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    assignedTo: uuid("assigned_to").references(() => users.id, { onDelete: "set null" }),
    status: text("status").$type<RequestStatus>().notNull().default("new"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    partTypeId: text("part_type_id"),
    axis: text("axis").$type<"front" | "rear" | null>(),
    side: text("side").$type<"left" | "right" | null>(),
    oe: text("oe"),
    qty: integer("qty").notNull().default(1),
    // Snapshot of the car at request time, so the sourcer sees what the customer saw.
    vehicleSnapshot: jsonb("vehicle_snapshot").$type<Record<string, unknown>>(),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("idx_requests_customer").on(t.customerId),
    index("idx_requests_status").on(t.status, t.updatedAt),
    index("idx_requests_assigned").on(t.assignedTo),
  ],
);

export const requestMessages = pgTable(
  "request_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").$type<"message" | "system">().notNull().default("message"),
    body: text("body").notNull(),
    // INTERNAL: staff-only notes are hidden from the customer.
    internal: boolean("internal").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("idx_messages_request").on(t.requestId, t.createdAt)],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id").references(() => users.id, { onDelete: "set null" }),
    storageKey: text("storage_key").notNull().unique(),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("idx_attachments_request").on(t.requestId)],
);

export const OFFER_KINDS = ["original", "oem", "aftermarket", "used"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];
export const FITMENT_LEVELS = ["vin_confirmed", "needs_check", "manual"] as const;
export type FitmentLevel = (typeof FITMENT_LEVELS)[number];
export const OFFER_STATUSES = ["draft", "published", "withdrawn", "accepted", "rejected"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    status: text("status").$type<OfferStatus>().notNull().default("draft"),
    title: text("title").notNull(),
    oe: text("oe"),
    manufacturer: text("manufacturer"),
    kind: text("kind").$type<OfferKind>().notNull(),
    condition: text("condition"),
    qty: integer("qty").notNull().default(1),
    priceKzt: integer("price_kzt").notNull(),
    leadDaysMin: integer("lead_days_min").notNull(),
    leadDaysMax: integer("lead_days_max").notNull(),
    fitment: text("fitment").$type<FitmentLevel>().notNull().default("needs_check"),
    note: text("note"),
    // INTERNAL fields below.
    priceCny: numeric("price_cny", { precision: 12, scale: 2 }),
    costKzt: integer("cost_kzt"),
    supplierName: text("supplier_name"),
    supplierUrl: text("supplier_url"),
    internalNote: text("internal_note"),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_offers_request").on(t.requestId)],
);

export const ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "purchased",
  "consolidation",
  "in_transit",
  "customs",
  "in_city",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requestId: uuid("request_id")
      .notNull()
      .references(() => partRequests.id, { onDelete: "cascade" }),
    offerId: uuid("offer_id")
      .notNull()
      .unique()
      .references(() => offers.id, { onDelete: "restrict" }),
    status: text("status").$type<OrderStatus>().notNull().default("awaiting_payment"),
    totalKzt: integer("total_kzt").notNull(),
    fitFeedback: text("fit_feedback").$type<"fits" | "not_fits" | null>(),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("idx_orders_customer").on(t.customerId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").$type<OrderStatus>().notNull(),
    note: text("note"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_order_events_order").on(t.orderId, t.createdAt)],
);

// Our own compatibility base: every confirmed (or refuted) pairing of a car and an OE number.
export const fitments = pgTable(
  "fitments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vin: text("vin"),
    brand: text("brand"),
    model: text("model"),
    year: integer("year"),
    trim: text("trim"),
    oe: text("oe").notNull(),
    partTypeId: text("part_type_id"),
    source: text("source").$type<"catalog" | "sourcer" | "install_feedback">().notNull(),
    result: text("result").$type<"fits" | "not_fits" | "unknown">().notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("idx_fitments_oe").on(t.oe), index("idx_fitments_vin").on(t.vin)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});
