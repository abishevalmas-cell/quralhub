import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { vehicles } from "@/lib/db/schema";
import { maskVin } from "@/lib/utils";
import { decodeBadge, vehicleName, vehicleTitle } from "./labels";

type Vehicle = typeof vehicles.$inferSelect;

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const badge = decodeBadge(vehicle);
  const name = vehicleName(vehicle);
  const details = [vehicle.label ? name : null, vehicle.year ? `${vehicle.year} г.` : null].filter(Boolean).join(", ");
  return (
    <Link
      href={`/garage/${vehicle.id}`}
      className="flex h-full items-start gap-3 rounded-2xl border border-line bg-card p-4 transition hover:border-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-soft">
        <Icon name="car" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-lg font-bold">{vehicleTitle(vehicle)}</span>
        {details ? <span className="text-sm text-muted">{details}</span> : null}
        {/* Masked: the list is a screen people show to others; the full VIN is on the car page. */}
        {vehicle.vin ? <span className="font-mono text-sm text-muted">{maskVin(vehicle.vin)}</span> : null}
        <span className="mt-1.5">
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </span>
      </span>
    </Link>
  );
}
