import { redirect } from "next/navigation";
import { carLook } from "@/components/garage/garage-car";
import { CarMedia } from "@/components/requests/car-media";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ListCard } from "@/components/ui/list-card";
import { getActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { listMyRequests } from "@/lib/services/requests";
import { formatDate, pluralRu } from "@/lib/utils";

export const metadata = { title: "Заявки" };

export default async function RequestsPage() {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/requests");
  const requests = await listMyRequests(await getDb(), actor);

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Подбор запчастей"
        title="Заявки"
        actions={
          requests.length ? (
            <ButtonLink href="/requests/new" variant="primary">
              <Icon name="plus" />
              Новая заявка
            </ButtonLink>
          ) : null
        }
      >
        Опишите деталь, и подборщик пришлёт варианты с ценой и сроком доставки.
      </PageHeader>

      {requests.length === 0 ? (
        <EmptyState
          title="Заявок пока нет"
          action={
            <ButtonLink href="/requests/new" variant="primary">
              Создать заявку
            </ButtonLink>
          }
        >
          Напишите, что нужно, например «передняя левая фара». Подборщик найдёт деталь для вашей машины.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {requests.map((r) => (
            <li key={r.id}>
              <ListCard
                href={`/requests/${r.id}`}
                media={<CarMedia look={carLook(r.car)} />}
                title={r.title}
                status={<RequestStatusBadge status={r.status} />}
                meta={
                  <>
                    <span className="font-semibold text-ink">№{r.number}</span>
                    <span>{r.vehicleLabel ?? "Без машины"}</span>
                    <span>Обновлена {formatDate(r.updatedAt)}</span>
                    {r.offerCount > 0 && r.status === "offered" ? (
                      <span className="font-semibold text-ok">
                        {r.offerCount} {pluralRu(r.offerCount, "предложение", "предложения", "предложений")}
                      </span>
                    ) : null}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
