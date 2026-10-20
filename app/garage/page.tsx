import { redirect } from "next/navigation";
import { EmptyGarage } from "@/components/garage/empty-garage";
import { garageCard } from "@/components/garage/garage-car";
import { GarageGrid } from "@/components/garage/garage-grid";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
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
      <PageHeader eyebrow={actor.role === "master" ? "Кабинет мастера" : "Мой автомобиль"} title="Мой гараж" actions={list.length ? add : undefined}>
        По VIN откроем каталог производителя, если он есть для вашей марки, а подборщик проверит каждую деталь. Активная машина — та,
        для которой ищем на главной.
      </PageHeader>
      {list.length ? (
        <GarageGrid cars={list.map(garageCard)} />
      ) : (
        <EmptyGarage />
      )}
    </div>
  );
}
