import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { daysBetween, nextDay, toPricingBody, toPricingForm } from "@/components/admin/pricing-values";
import { actorFromToken, createSession, type Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { offers, orders, partRequests, providerCalls, sessions, settings, users, type OrderStatus, type RequestStatus } from "@/lib/db/schema";
import { DEFAULT_PRICING, type PricingSettings } from "@/lib/pricing";
import { createGateway } from "@/lib/providers";
import { FIXTURE_VINS, FixtureProvider } from "@/lib/providers/fixture";
import type { PartsProvider } from "@/lib/providers/types";
import { makeUser, testDb } from "@/tests/helpers/db";
import {
  dashboard,
  getPricing,
  JOURNAL_LIMIT,
  listUsers,
  OWN_ROLE_MESSAGE,
  providerStatus,
  RATE_DATE_MESSAGE,
  savePricing,
  setUserRole,
  USERS_LIMIT,
} from "../admin";

// Route handlers read the actor from the session cookie and the database from getDb(); both are swapped here,
// everything else (zod bodies, services, the fixture provider) runs for real.
const routeState = vi.hoisted(() => ({ db: null as Db | null, actor: null as Actor | null }));
vi.mock("@/lib/auth/current", async () => {
  const { unauthorized } = await import("@/lib/server/errors");
  return {
    getActor: async () => routeState.actor,
    requireActor: async () => {
      if (!routeState.actor) throw unauthorized();
      return routeState.actor;
    },
  };
});
vi.mock("@/lib/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/db")>()),
  getDb: async () => routeState.db,
}));

const T0 = new Date("2026-10-20T08:00:00Z");
const DAY = 24 * 3600 * 1000;

const custom: PricingSettings = {
  cnyRate: 68.1234,
  cnyRateDate: "2026-10-20",
  markupPct: 25.5,
  perKgKzt: 2100,
  localChinaKzt: 3500,
  dutyPct: 5,
  roundTo: 500,
  minMarginKzt: 5000,
};

let requestSeq = 0;
async function addRequest(db: Db, customer: Actor, extra: Partial<typeof partRequests.$inferInsert> = {}) {
  const [row] = await db
    .insert(partRequests)
    .values({ customerId: customer.id, title: `Деталь ${++requestSeq}`, ...extra })
    .returning();
  return row;
}

async function addOrder(db: Db, customer: Actor, status: OrderStatus = "awaiting_payment", createdAt = T0) {
  const request = await addRequest(db, customer, { status: "accepted", createdAt });
  const [offer] = await db
    .insert(offers)
    .values({ requestId: request.id, title: "Колодки", kind: "original", priceKzt: 25000, leadDaysMin: 10, leadDaysMax: 14, status: "accepted" })
    .returning();
  const [order] = await db
    .insert(orders)
    .values({ customerId: customer.id, requestId: request.id, offerId: offer.id, totalKzt: 25000, status })
    .returning();
  return order;
}

// Journal rows of one test get distinct times, so "newest first" does not depend on random ids.
function ticking(from: Date) {
  let t = from.getTime();
  return () => new Date((t += 1000));
}

const at = (seconds: number) => new Date(T0.getTime() + seconds * 1000);

// A live-mode provider that answers from a script and never touches the network.
function liveProvider(): PartsProvider {
  const ok = { status: "success" as const, message: "Ответ 17VIN", providerCode: 1, source: "provider" as const };
  return {
    name: "17vin",
    mode: "live",
    decodeVin: async () => ({ ...ok, candidates: [], ambiguous: false }),
    categories: async () => ({ ...ok, categories: [] }),
    parts: async () => ({ ...ok, parts: [] }),
    searchOe: async () => ({ ...ok, status: "empty" as const, providerCode: 1006, parts: [] }),
  };
}

async function setup() {
  const db = await testDb();
  const admin = await makeUser(db, "admin", { name: "Админ", createdAt: at(-100) });
  return { db, admin };
}

describe("admin permissions", () => {
  it("refuses every admin function to customers, masters and sourcers", async () => {
    const { db, admin } = await setup();
    for (const role of ["customer", "master", "sourcer"] as const) {
      const actor = await makeUser(db, role);
      const forbidden = { status: 403, code: "forbidden" };
      await expect(listUsers(db, actor)).rejects.toMatchObject(forbidden);
      await expect(setUserRole(db, actor, admin.id, "customer")).rejects.toMatchObject(forbidden);
      await expect(setUserRole(db, actor, actor.id, "admin")).rejects.toMatchObject(forbidden);
      await expect(getPricing(db, actor)).rejects.toMatchObject(forbidden);
      await expect(savePricing(db, actor, custom, T0)).rejects.toMatchObject(forbidden);
      await expect(providerStatus(db, actor, { provider: new FixtureProvider(), env: {} })).rejects.toMatchObject(forbidden);
      await expect(dashboard(db, actor, T0)).rejects.toMatchObject(forbidden);
    }
    // Nothing changed on the way.
    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, admin.id));
    expect(row.role).toBe("admin");
    expect(await db.select().from(settings)).toEqual([]);
  });
});

describe("listUsers", () => {
  it("lists users newest first with a formatted phone and their request and order counts", async () => {
    const { db, admin } = await setup();
    const customer = await makeUser(db, "customer", { name: "Ержан", city: "Алматы", createdAt: at(1) });
    const master = await makeUser(db, "master", { name: "Асхат", company: "СТО Мотор", createdAt: at(2) });
    await addRequest(db, customer);
    await addRequest(db, customer, { status: "cancelled" });
    await addOrder(db, customer, "paid");
    const sourcer = await makeUser(db, "sourcer", { name: "Лю", createdAt: at(3) });
    await addRequest(db, master, { assignedTo: sourcer.id, status: "searching" });
    await addRequest(db, master, { assignedTo: sourcer.id, status: "closed" });

    const { users: list, truncated } = await listUsers(db, admin);
    expect(truncated).toBe(false);
    expect(list.map((u) => u.id)).toEqual([sourcer.id, master.id, customer.id, admin.id]);
    const byId = Object.fromEntries(list.map((u) => [u.id, u]));
    expect(byId[customer.id]).toMatchObject({
      name: "Ержан",
      city: "Алматы",
      role: "customer",
      requests: 3, // two of their own plus the one behind the order
      orders: 1,
      assignedOpen: 0,
      adminByEnv: false,
    });
    expect(byId[customer.id].phone).toMatch(/^\+7 \d{3} \d{3} \d{2} \d{2}$/);
    expect(byId[customer.id].createdAt).toBeInstanceOf(Date);
    expect(byId[master.id]).toMatchObject({ company: "СТО Мотор", requests: 2, orders: 0 });
    // Only open requests count as work in progress.
    expect(byId[sourcer.id]).toMatchObject({ requests: 0, assignedOpen: 1 });
  });

  it("filters by role, staff and search text, including the phone digits", async () => {
    const { db, admin } = await setup();
    const customer = await makeUser(db, "customer", { name: "Ержан Нурланов", company: "Auto_50%", phone: "77079876543", createdAt: at(1) });
    const sourcer = await makeUser(db, "sourcer", { name: "Лю Ян", createdAt: at(2) });
    const ids = (r: { users: { id: string }[] }) => r.users.map((u) => u.id);

    expect(ids(await listUsers(db, admin, { role: "customer" }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { role: "staff" }))).toEqual([sourcer.id, admin.id]);
    expect(ids(await listUsers(db, admin, { q: "  нурлан " }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { q: "auto_50%" }))).toEqual([customer.id]);
    // LIKE wildcards in the search are taken literally: only the company with "%" and "_" in it matches.
    expect(ids(await listUsers(db, admin, { q: "%" }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { q: "_" }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { q: "Лю%Ян" }))).toEqual([]);

    expect(ids(await listUsers(db, admin, { q: "+7 707 987 65 43" }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { q: "8 (707) 987-65-43" }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { q: "6543" }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { q: "707 98" }))).toEqual([customer.id]);
    expect(ids(await listUsers(db, admin, { q: "Ержан", role: "sourcer" }))).toEqual([]);
    expect(ids(await listUsers(db, admin, { q: "", role: "" }))).toHaveLength(3);

    await expect(listUsers(db, admin, { role: "boss" })).rejects.toMatchObject({ status: 400, code: "invalid_role" });
  });

  it("caps the list and says so", async () => {
    const { db, admin } = await setup();
    await db.insert(users).values(
      Array.from({ length: USERS_LIMIT + 5 }, (_, i) => ({ phone: `7702${String(i).padStart(7, "0")}`, name: "Клиент" })),
    );
    const result = await listUsers(db, admin);
    expect(result.users).toHaveLength(USERS_LIMIT);
    expect(result.truncated).toBe(true);
  });

  it("marks users whose phone is in ADMIN_PHONES", async () => {
    const { db, admin } = await setup();
    const pinned = await makeUser(db, "sourcer");
    vi.stubEnv("ADMIN_PHONES", `+${pinned.phone}`);
    try {
      const { users: list } = await listUsers(db, admin);
      expect(list.find((u) => u.id === pinned.id)?.adminByEnv).toBe(true);
      expect(list.find((u) => u.id === admin.id)?.adminByEnv).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("setUserRole", () => {
  afterEach(() => vi.restoreAllMocks());

  it("grants and removes staff roles and logs ids only", async () => {
    const { db, admin } = await setup();
    const user = await makeUser(db, "customer", { name: "Ержан Нурланов", company: "СТО Мотор" });
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const sourcer = await setUserRole(db, admin, user.id, "sourcer", T0);
    expect(sourcer).toMatchObject({ id: user.id, role: "sourcer", name: "Ержан Нурланов", adminByEnv: false });
    expect(sourcer.phone).toMatch(/^\+7 /);
    const promoted = await setUserRole(db, admin, user.id, "admin", T0);
    expect(promoted.role).toBe("admin");
    // The new admin can demote the one who promoted them, but not themselves.
    const newAdmin: Actor = { ...user, role: "admin" };
    await expect(setUserRole(db, newAdmin, newAdmin.id, "customer")).rejects.toMatchObject({ status: 403, code: "own_role", message: OWN_ROLE_MESSAGE });
    expect((await setUserRole(db, newAdmin, admin.id, "master")).role).toBe("master");
    const roles = Object.fromEntries((await db.select().from(users)).map((u) => [u.id, u.role]));
    expect(roles).toEqual({ [user.id]: "admin", [admin.id]: "master" });
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.updatedAt).toEqual(T0);

    const logged = info.mock.calls.map((args) => args.join(" ")).join("\n");
    expect(logged).toContain(user.id);
    expect(logged).toContain("customer -> sourcer");
    for (const secret of [user.phone, user.phone.slice(-7), "Ержан", "Нурланов", "СТО Мотор"]) expect(logged).not.toContain(secret);
  });

  it("signs a demoted staff member out everywhere, but not on a promotion or a customer/master switch", async () => {
    const { db, admin } = await setup();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const sourcer = await makeUser(db, "sourcer");
    const customer = await makeUser(db, "customer");
    const tokens = (await Promise.all([createSession(db, sourcer.id), createSession(db, sourcer.id), createSession(db, customer.id)])).map(
      (s) => s.token,
    );
    expect(await actorFromToken(db, tokens[0])).toMatchObject({ id: sourcer.id, role: "sourcer" });

    await setUserRole(db, admin, customer.id, "master");
    await setUserRole(db, admin, sourcer.id, "admin");
    expect(await actorFromToken(db, tokens[0])).toMatchObject({ role: "admin" });
    expect(await actorFromToken(db, tokens[2])).toMatchObject({ role: "master" });

    await setUserRole(db, admin, sourcer.id, "customer");
    expect(await actorFromToken(db, tokens[0])).toBeNull();
    expect(await actorFromToken(db, tokens[1])).toBeNull();
    expect(await actorFromToken(db, tokens[2])).toMatchObject({ id: customer.id });
    expect(await db.select().from(sessions).where(eq(sessions.userId, sourcer.id))).toHaveLength(0);
  });

  it("keeps the role unchanged when it is already set and writes no log line", async () => {
    const { db, admin } = await setup();
    const user = await makeUser(db, "sourcer");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    expect((await setUserRole(db, admin, user.id, "sourcer")).role).toBe("sourcer");
    expect(info).not.toHaveBeenCalled();
  });

  it("refuses the admin's own role, unknown roles and unknown users", async () => {
    const { db, admin } = await setup();
    const user = await makeUser(db, "customer");
    await expect(setUserRole(db, admin, admin.id, "customer")).rejects.toMatchObject({ status: 403, code: "own_role" });
    await expect(setUserRole(db, admin, admin.id, "admin")).rejects.toMatchObject({ status: 403, code: "own_role" });
    for (const role of ["boss", "", null, 1, "ADMIN"])
      await expect(setUserRole(db, admin, user.id, role)).rejects.toMatchObject({ status: 400, code: "invalid_role" });
    for (const id of ["nope", "00000000-0000-0000-0000-000000000000", "' or 1=1 --"])
      await expect(setUserRole(db, admin, id, "sourcer")).rejects.toMatchObject({ status: 404 });
    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, user.id));
    expect(row.role).toBe("customer");
  });
});

describe("pricing", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the defaults, saves new values with the rate date and reads them back", async () => {
    const { db, admin } = await setup();
    expect(await getPricing(db, admin)).toEqual(DEFAULT_PRICING);
    vi.spyOn(console, "info").mockImplementation(() => {});
    expect(await savePricing(db, admin, { ...custom, extra: "ignored" }, T0)).toEqual(custom);
    expect(await getPricing(db, admin)).toEqual(custom);
  });

  it("rejects invalid values with the field's message and keeps the stored ones", async () => {
    const { db, admin } = await setup();
    vi.spyOn(console, "info").mockImplementation(() => {});
    await savePricing(db, admin, custom, T0);
    await expect(savePricing(db, admin, { ...custom, cnyRate: 0 }, T0)).rejects.toMatchObject({
      status: 400,
      code: "invalid_pricing_settings",
      message: expect.stringContaining("Курс юаня"),
    });
    await expect(savePricing(db, admin, { ...custom, cnyRateDate: "20.10.2026" }, T0)).rejects.toMatchObject({ status: 400 });
    await expect(savePricing(db, admin, { ...custom, roundTo: 250 }, T0)).rejects.toMatchObject({ status: 400 });
    await expect(savePricing(db, admin, null, T0)).rejects.toMatchObject({ status: 400 });
    expect(await getPricing(db, admin)).toEqual(custom);
  });

  it("takes what the pricing form sends, with Russian decimal commas, and never saves an empty field as 0", async () => {
    const { db, admin } = await setup();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const form = toPricingForm(custom);
    expect(form).toMatchObject({ cnyRate: "68,1234", markupPct: "25,5", perKgKzt: "2100", roundTo: "500" });
    expect(await savePricing(db, admin, toPricingBody({ ...form, perKgKzt: " 2 100 ", localChinaKzt: "3 500" }), T0)).toEqual(custom);
    // An empty field goes out as null (NaN in JSON) and comes back with that field's message.
    const body = JSON.parse(JSON.stringify(toPricingBody({ ...form, minMarginKzt: "" })));
    expect(body.minMarginKzt).toBeNull();
    await expect(savePricing(db, admin, body, T0)).rejects.toMatchObject({ status: 400, message: expect.stringContaining("Минимальная наценка") });
    await expect(savePricing(db, admin, toPricingBody({ ...form, cnyRate: "67,75,1" }), T0)).rejects.toMatchObject({ status: 400 });
    expect(await getPricing(db, admin)).toEqual(custom);
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(daysBetween("2026-10-15", "2026-10-20")).toBe(5);
    expect(daysBetween("", "2026-10-20")).toBeNull();
  });

  it("accepts a rate dated tomorrow in Astana but not later", async () => {
    const { db, admin } = await setup();
    vi.spyOn(console, "info").mockImplementation(() => {});
    // 20:00 UTC on the 20th is already the 21st in Astana, so the 22nd is "tomorrow".
    const evening = new Date("2026-10-20T20:00:00Z");
    expect((await savePricing(db, admin, { ...custom, cnyRateDate: "2026-10-22" }, evening)).cnyRateDate).toBe("2026-10-22");
    await expect(savePricing(db, admin, { ...custom, cnyRateDate: "2026-10-23" }, evening)).rejects.toMatchObject({
      status: 400,
      message: RATE_DATE_MESSAGE,
    });
    await expect(savePricing(db, admin, { ...custom, cnyRateDate: "2026-10-22" }, T0)).rejects.toMatchObject({ status: 400 });
  });
});

describe("providerStatus", () => {
  it("reports fixture mode, the journal with masked inputs and the cache size", async () => {
    const { db, admin } = await setup();
    const customer = await makeUser(db);
    const gateway = createGateway(db, new FixtureProvider(), { userId: customer.id, now: ticking(T0) });
    await gateway.decodeVin(FIXTURE_VINS.bydSongPlus);
    await gateway.decodeVin(FIXTURE_VINS.bydSongPlus); // cache hit: no journal row
    await gateway.searchOe("10301727-00");
    // A row written without masking (older code, manual insert) is masked on the way out.
    await db.insert(providerCalls).values({
      provider: "fixture",
      operation: "oe",
      mode: "fixture",
      inputMask: `${FIXTURE_VINS.geelyGalaxyE5} x`,
      status: "invalid",
      durationMs: 3,
      createdAt: at(10),
    });

    const report = await providerStatus(db, admin, { provider: new FixtureProvider(), env: {}, now: T0 });
    expect(report).toMatchObject({ mode: "fixture", provider: "fixture", dailyLimit: 200, callsToday: 3, cacheEntries: 2 });
    expect(report.resetsAt).toEqual(new Date("2026-10-21T00:00:00Z"));
    expect(report.lastCalls.map((c) => [c.operation, c.mode, c.inputMask])).toEqual([
      ["oe", "fixture", "L6T…0002 x"],
      ["oe", "fixture", "10301727-00"],
      ["decode", "fixture", "LGX…0001"],
    ]);
    expect(report.lastCalls[0].status).toBe("invalid");
    expect(report.lastCalls[2]).toMatchObject({ status: "success", providerCode: 1, durationMs: expect.any(Number), createdAt: at(1) });
    const payload = JSON.stringify(report);
    for (const vin of Object.values(FIXTURE_VINS)) expect(payload).not.toContain(vin);
    expect(payload).not.toContain(customer.id); // who made the call is not part of the journal view
  });

  it("counts today's live calls against the limit from the environment", async () => {
    const { db, admin } = await setup();
    const provider = liveProvider();
    const env = { TETIX_17VIN_DAILY_LIMIT: "5" };
    const gateway = createGateway(db, provider, { now: ticking(T0), env });
    await gateway.decodeVin(FIXTURE_VINS.deepalS7);
    await gateway.searchOe("10273368-00");
    await createGateway(db, new FixtureProvider(), { now: at(10) }).decodeVin(FIXTURE_VINS.bydSongPlus);
    await db.insert(providerCalls).values({
      provider: "17vin",
      operation: "decode",
      mode: "live",
      inputMask: "LS5…0003",
      status: "success",
      durationMs: 900,
      createdAt: new Date(T0.getTime() - DAY),
    });

    const report = await providerStatus(db, admin, { provider, env, now: T0 });
    expect(report).toMatchObject({ mode: "live", provider: "17vin", dailyLimit: 5, callsToday: 2 });
    expect(report.lastCalls).toHaveLength(4);
    expect(report.lastCalls[0]).toMatchObject({ mode: "fixture" }); // the journal shows every provider, newest first
    expect(report.lastCalls.find((c) => c.operation === "oe")).toMatchObject({ status: "empty", providerCode: 1006 });
    // Yesterday's calls do not count; tomorrow starts from zero.
    expect((await providerStatus(db, admin, { provider, env, now: new Date(T0.getTime() + DAY) })).callsToday).toBe(0);
  });

  it("shows the last 50 calls only and picks live mode only when both credentials are set", async () => {
    const { db, admin } = await setup();
    await db.insert(providerCalls).values(
      Array.from({ length: JOURNAL_LIMIT + 10 }, (_, i) => ({
        provider: "fixture",
        operation: "decode",
        mode: "fixture" as const,
        inputMask: `LGX…${String(i).padStart(4, "0")}`,
        status: "success",
        durationMs: i,
        createdAt: new Date(T0.getTime() + i * 1000),
      })),
    );
    const report = await providerStatus(db, admin, { env: {}, now: T0 });
    expect(report.mode).toBe("fixture");
    expect(report.lastCalls).toHaveLength(JOURNAL_LIMIT);
    expect(report.lastCalls[0].inputMask).toBe(`LGX…${String(JOURNAL_LIMIT + 9).padStart(4, "0")}`);

    expect((await providerStatus(db, admin, { env: { TETIX_17VIN_USER: "u" }, now: T0 })).mode).toBe("fixture");
    const live = await providerStatus(db, admin, { env: { TETIX_17VIN_USER: "user-x", TETIX_17VIN_PASSWORD: "secret-y" }, now: T0 });
    expect(live).toMatchObject({ mode: "live", provider: "17vin", callsToday: 0, dailyLimit: 200 });
    const payload = JSON.stringify(live);
    expect(payload).not.toContain("user-x");
    expect(payload).not.toContain("secret-y");
  });
});

describe("dashboard", () => {
  it("counts requests, orders and users by status and the requests of the last 7 days", async () => {
    const { db, admin } = await setup();
    const customer = await makeUser(db);
    await makeUser(db, "master");
    await makeUser(db, "sourcer");
    const statuses: RequestStatus[] = ["new", "new", "searching", "offered", "cancelled"];
    for (const status of statuses) await addRequest(db, customer, { status, createdAt: new Date(T0.getTime() - DAY) });
    await addRequest(db, customer, { status: "closed", createdAt: new Date(T0.getTime() - 8 * DAY) });
    // Each order also adds an accepted request, two days old.
    await addOrder(db, customer, "paid", new Date(T0.getTime() - 2 * DAY));
    await addOrder(db, customer, "in_transit", new Date(T0.getTime() - 2 * DAY));

    const result = await dashboard(db, admin, T0);
    expect(result.requestsByStatus).toEqual({ new: 2, clarification: 0, searching: 1, offered: 1, accepted: 2, closed: 1, cancelled: 1 });
    expect(result.ordersByStatus).toMatchObject({ awaiting_payment: 0, paid: 1, in_transit: 1, delivered: 0, returned: 0 });
    expect(Object.keys(result.ordersByStatus)).toHaveLength(10);
    expect(result.usersByRole).toEqual({ customer: 1, master: 1, sourcer: 1, admin: 1 });
    expect(result.totals).toEqual({ requests: 8, orders: 2, users: 4 });

    // The closed request is 8 days old; the rest are one or two days old.
    expect(result.requestsLast7Days).toBe(7);
    expect((await dashboard(db, admin, new Date(T0.getTime() + 5.5 * DAY))).requestsLast7Days).toBe(5);
    expect((await dashboard(db, admin, new Date(T0.getTime() + 30 * DAY))).requestsLast7Days).toBe(0);
  });

  it("returns zeros for an empty service", async () => {
    const db = await testDb();
    const admin = await makeUser(db, "admin");
    const result = await dashboard(db, admin, T0);
    expect(Object.values(result.requestsByStatus).every((n) => n === 0)).toBe(true);
    expect(Object.values(result.ordersByStatus).every((n) => n === 0)).toBe(true);
    expect(result).toMatchObject({ requestsLast7Days: 0, totals: { requests: 0, orders: 0, users: 1 }, usersByRole: { admin: 1 } });
  });
});

describe("admin API routes", () => {
  afterEach(() => {
    routeState.db = null;
    routeState.actor = null;
    vi.restoreAllMocks();
  });

  const call = async (handler: (request: Request, context: never) => Promise<Response>, url: string, init: RequestInit = {}, id?: string) => {
    const request = new Request(`http://localhost${url}`, {
      ...init,
      headers: init.body ? { "content-type": "application/json" } : undefined,
    });
    const response = await handler(request, (id ? { params: Promise.resolve({ id }) } : undefined) as never);
    return { status: response.status, body: await response.json() };
  };

  const routes = async () => ({
    usersRoute: await import("@/app/api/admin/users/route"),
    userRoute: await import("@/app/api/admin/users/[id]/route"),
    pricingRoute: await import("@/app/api/admin/pricing/route"),
    providerRoute: await import("@/app/api/admin/provider/route"),
    dashboardRoute: await import("@/app/api/admin/dashboard/route"),
  });

  it("lists users, changes a role, saves prices and reads the provider and the summary", async () => {
    const { db, admin } = await setup();
    routeState.db = db;
    routeState.actor = admin;
    vi.spyOn(console, "info").mockImplementation(() => {});
    const user = await makeUser(db, "customer", { name: "Ержан" });
    const { usersRoute, userRoute, pricingRoute, providerRoute, dashboardRoute } = await routes();

    const found = await call(usersRoute.GET, `/api/admin/users?q=${encodeURIComponent("ерж")}&role=customer`);
    expect(found).toMatchObject({ status: 200, body: { truncated: false, users: [{ id: user.id, name: "Ержан", role: "customer" }] } });
    expect((await call(usersRoute.GET, "/api/admin/users?role=boss")).status).toBe(400);

    const patch = (id: string, body: unknown) => call(userRoute.PATCH, `/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }, id);
    expect(await patch(user.id, { role: "sourcer" })).toMatchObject({ status: 200, body: { user: { id: user.id, role: "sourcer" } } });
    expect(await patch(user.id, { role: "boss" })).toMatchObject({ status: 400, body: { code: "invalid_role" } });
    expect(await patch(user.id, {})).toMatchObject({ status: 400, body: { error: "Выберите роль: клиент, мастер, подборщик или администратор" } });
    expect(await patch(admin.id, { role: "customer" })).toMatchObject({ status: 403, body: { code: "own_role", error: OWN_ROLE_MESSAGE } });
    expect((await patch("00000000-0000-0000-0000-000000000000", { role: "master" })).status).toBe(404);

    expect(await call(pricingRoute.GET, "/api/admin/pricing")).toMatchObject({ status: 200, body: { pricing: DEFAULT_PRICING } });
    const today = new Date().toISOString().slice(0, 10);
    const saved = await call(pricingRoute.PUT, "/api/admin/pricing", { method: "PUT", body: JSON.stringify({ ...custom, cnyRateDate: today }) });
    expect(saved).toMatchObject({ status: 200, body: { pricing: { ...custom, cnyRateDate: today } } });
    expect(await call(pricingRoute.PUT, "/api/admin/pricing", { method: "PUT", body: JSON.stringify({ ...custom, markupPct: -1 }) })).toMatchObject({
      status: 400,
      body: { error: expect.stringContaining("Наценка") },
    });
    expect((await call(pricingRoute.PUT, "/api/admin/pricing", { method: "PUT", body: "[1]" })).status).toBe(400);

    const provider = await call(providerRoute.GET, "/api/admin/provider");
    expect(provider).toMatchObject({ status: 200, body: { mode: "fixture", lastCalls: [], cacheEntries: 0 } });

    const summary = await call(dashboardRoute.GET, "/api/admin/dashboard");
    expect(summary).toMatchObject({ status: 200, body: { usersByRole: { admin: 1, sourcer: 1 }, totals: { users: 2 } } });
  });

  it("answers 403 to staff and customers and 401 without a session", async () => {
    const { db, admin } = await setup();
    routeState.db = db;
    const { usersRoute, userRoute, pricingRoute, providerRoute, dashboardRoute } = await routes();
    const attempts = [
      () => call(usersRoute.GET, "/api/admin/users"),
      () => call(userRoute.PATCH, `/api/admin/users/${admin.id}`, { method: "PATCH", body: JSON.stringify({ role: "customer" }) }, admin.id),
      () => call(pricingRoute.GET, "/api/admin/pricing"),
      () => call(pricingRoute.PUT, "/api/admin/pricing", { method: "PUT", body: JSON.stringify(custom) }),
      () => call(providerRoute.GET, "/api/admin/provider"),
      () => call(dashboardRoute.GET, "/api/admin/dashboard"),
    ];
    for (const role of ["customer", "master", "sourcer"] as const) {
      const actor = await makeUser(db, role);
      routeState.actor = actor;
      for (const attempt of attempts) expect(await attempt()).toMatchObject({ status: 403, body: { code: "forbidden" } });
      // Granting oneself a role is refused before the body is even looked at.
      expect(
        await call(userRoute.PATCH, `/api/admin/users/${actor.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) }, actor.id),
      ).toMatchObject({ status: 403 });
    }
    routeState.actor = null;
    for (const attempt of attempts) expect(await attempt()).toMatchObject({ status: 401, body: { code: "unauthorized" } });

    const roles = await db.select({ role: users.role }).from(users);
    expect(roles.filter((r) => r.role === "admin")).toHaveLength(1);
    expect(await db.select().from(settings)).toEqual([]);
  });
});
