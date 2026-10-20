import { redirect } from "next/navigation";
import { RequestForm } from "@/components/requests/request-form";
import { PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { listVehicleOptions, requestDraftFromQuery } from "@/lib/services/requests";

export const metadata = { title: "Новая заявка" };

type Query = Record<string, string | string[] | undefined>;

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const actor = await getActor();
  if (!actor) {
    const params = new URLSearchParams();
    for (const key of ["vehicle", "oe", "title", "part", "axis", "side", "q", "photo"]) {
      const value = query[key];
      if (typeof value === "string" && value) params.set(key, value.slice(0, 300));
    }
    const next = "/requests/new" + (params.size ? `?${params}` : "");
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  const vehicles = await listVehicleOptions(await getDb(), actor);
  const draft = requestDraftFromQuery(
    query,
    vehicles.map((v) => v.id),
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Заявки" title="Новая заявка">
        Подборщик проверит, что подходит к вашей машине, и пришлёт варианты с ценой и сроком.
      </PageHeader>
      <RequestForm vehicles={vehicles} draft={draft} />
    </div>
  );
}
