import { redirect } from "next/navigation";
import { carLook } from "@/components/garage/garage-car";
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
  // Only the label and the picture reach the client form; the VIN stays on the server.
  const vehicles = (await listVehicleOptions(await getDb(), actor)).map((v) => ({ id: v.id, label: v.label, look: carLook(v.car) }));
  const draft = requestDraftFromQuery(
    query,
    vehicles.map((v) => v.id),
  );

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Заявки" title="Новая заявка">
        Подборщик проверит, что подходит к вашей машине, и пришлёт варианты с ценой и сроком.
      </PageHeader>
      <RequestForm vehicles={vehicles} draft={draft} />
    </div>
  );
}
