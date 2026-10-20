import { redirect } from "next/navigation";
import { VehicleCard } from "@/components/garage/vehicle-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { listVehicles } from "@/lib/services/vehicles";

export const metadata = { title: "Гараж" };

export default async function GaragePage() {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/garage");
  const list = await listVehicles(await getDb(), actor);
  const add = (
    <ButtonLink href="/garage/new" variant="primary">
      <Icon name="plus" />
      Добавить машину
    </ButtonLink>
  );
  return (
    <div>
      <PageHeader eyebrow="Гараж" title="Мои машины" actions={list.length ? add : undefined}>
        По VIN откроем каталог именно вашей машины и отметим детали, которые ей подходят.
      </PageHeader>
      {list.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((vehicle) => (
            <li key={vehicle.id}>
              <VehicleCard vehicle={vehicle} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="В гараже пока пусто" action={add}>
          Добавьте машину по VIN из техпаспорта — подберём детали по каталогу. VIN нет под рукой? Можно указать марку, модель и год.
        </EmptyState>
      )}
    </div>
  );
}
