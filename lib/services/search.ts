import { desc, eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { partRequests, type RequestStatus } from "@/lib/db/schema";
import { createGateway, getProvider, type PartsProvider, type ProviderStatus } from "@/lib/providers";
import { catalogAvailability } from "./catalog";
import { readSnapshot, vehicleLabel } from "./requests";
import { listVehicles, type Vehicle } from "./vehicles";

// Data for the signed-in home page: the garage for the search box and the latest requests.
// Only what the page shows leaves this module: no VINs, no candidates, nothing from offers.

export const HOME_REQUESTS_LIMIT = 4;

// How the search box can help with this car:
//   catalog       the VIN catalog opens;
//   catalog_maybe it opens, but for this maker it was empty in the 17VIN trial (epc_id "0");
//   not_decoded   the VIN is not decoded yet (provider error), the garage page offers a retry;
//   manual        no VIN catalog: the car was added without VIN, the provider does not cover it, or the catalog
//                 came back empty or unsupported when it was last opened.
export type CatalogMode = "catalog" | "catalog_maybe" | "not_decoded" | "manual";

export type HomeVehicle = { id: string; title: string; catalog: CatalogMode };
export type HomeRequest = {
  id: string;
  number: number;
  title: string;
  status: RequestStatus;
  vehicleLabel: string | null;
  updatedAt: Date;
};
export type HomeData = { vehicles: HomeVehicle[]; requests: HomeRequest[] };

// `level1` is what the first catalog page answered the last time it was opened (from the cache), if known.
export function catalogMode(vehicle: Pick<Vehicle, "vin" | "decodeStatus" | "epc" | "epcId">, level1: ProviderStatus | null = null): CatalogMode {
  const { available, reason } = catalogAvailability(vehicle);
  if (available) {
    if (level1 === "empty" || level1 === "unsupported") return "manual";
    return reason === "likely_unavailable" ? "catalog_maybe" : "catalog";
  }
  return reason === "no_epc" ? "not_decoded" : "manual";
}

// The cached answer only: the home page never makes a paid call.
async function lastLevel1(db: Db, vehicle: Vehicle, provider: PartsProvider): Promise<ProviderStatus | null> {
  if (!vehicle.vin || !vehicle.epc || !catalogAvailability(vehicle).available) return null;
  const hit = await createGateway(db, provider).peekCategories({ vin: vehicle.vin, epc: vehicle.epc, level: 1 });
  return hit?.status ?? null;
}

export async function homeData(db: Db, actor: Actor, deps: { provider?: PartsProvider } = {}): Promise<HomeData> {
  const provider = deps.provider ?? getProvider();
  const [cars, rows] = await Promise.all([
    listVehicles(db, actor),
    // Staff see only their own requests here too; the queue lives under /sourcer.
    db
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
      .limit(HOME_REQUESTS_LIMIT),
  ]);
  const level1 = await Promise.all(cars.map((v) => lastLevel1(db, v, provider)));
  return {
    vehicles: cars.map((v, i) => ({ id: v.id, title: vehicleLabel(v), catalog: catalogMode(v, level1[i]) })),
    requests: rows.map((r) => ({
      id: r.id,
      number: r.number,
      title: r.title,
      status: r.status,
      vehicleLabel: readSnapshot(r.vehicleSnapshot)?.label ?? null,
      updatedAt: r.updatedAt,
    })),
  };
}
