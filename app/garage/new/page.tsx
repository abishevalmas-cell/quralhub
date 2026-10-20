import Link from "next/link";
import { redirect } from "next/navigation";
import { AddVehicleForm } from "@/components/garage/add-vehicle-form";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { getModel } from "@/lib/catalog";
import { maxYear } from "@/lib/services/vehicles";

export const metadata = { title: "Добавить машину" };

type Query = { vin?: string | string[]; mode?: string | string[]; model?: string | string[] };

// ?vin= prefills the VIN tab; ?model=<catalog id> or ?mode=manual opens "Выбрать модель".
export default async function NewVehiclePage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const vin = typeof query.vin === "string" ? query.vin.slice(0, 40) : "";
  const model = getModel(typeof query.model === "string" ? query.model : null);
  const actor = await getActor();
  if (!actor) {
    const params = new URLSearchParams();
    if (vin) params.set("vin", vin);
    if (model) params.set("model", model.id);
    const next = "/garage/new" + (params.size ? `?${params}` : "");
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const modelMode = !vin && (query.mode === "manual" || query.mode === "model" || Boolean(model));
  return (
    <div className="max-w-3xl">
      <Link href="/garage" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <Icon name="chevron-left" className="size-4" />
        Гараж
      </Link>
      <PageHeader eyebrow="Мой гараж" title="Добавить машину">
        По VIN откроем каталог вашей машины и отметим детали, которые подходят по VIN. Нет VIN под рукой — выберите модель.
      </PageHeader>
      <AddVehicleForm initialVin={vin} initialMode={modelMode ? "model" : "vin"} initialModelId={model?.id ?? null} maxYear={maxYear()} />
    </div>
  );
}
