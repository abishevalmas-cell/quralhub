import Link from "next/link";
import { redirect } from "next/navigation";
import { AddVehicleForm } from "@/components/garage/add-vehicle-form";
import { PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { maxYear } from "@/lib/services/vehicles";

export const metadata = { title: "Добавить машину" };

type Query = { vin?: string | string[]; mode?: string | string[] };

export default async function NewVehiclePage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const vin = typeof query.vin === "string" ? query.vin.slice(0, 40) : "";
  const actor = await getActor();
  if (!actor) {
    const next = "/garage/new" + (vin ? `?${new URLSearchParams({ vin })}` : "");
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/garage" className="mb-3 inline-block text-sm font-semibold text-muted hover:text-ink">
        ← Гараж
      </Link>
      <PageHeader eyebrow="Гараж" title="Добавить машину">
        По VIN откроем каталог вашей машины и отметим детали, которые подходят по VIN.
      </PageHeader>
      <AddVehicleForm initialVin={vin} initialMode={query.mode === "manual" && !vin ? "manual" : "vin"} maxYear={maxYear()} />
    </div>
  );
}
