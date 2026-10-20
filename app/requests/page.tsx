import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
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
    <div className="mx-auto max-w-3xl">
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
              <Link
                href={`/requests/${r.id}`}
                className="grid gap-2 rounded-2xl border border-line bg-card p-4 transition hover:border-ink/30 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-[17px] font-bold leading-snug">{r.title}</span>
                  <RequestStatusBadge status={r.status} className="mt-0.5 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                  <span>№{r.number}</span>
                  <span>{r.vehicleLabel ?? "Без машины"}</span>
                  <span>Обновлена {formatDate(r.updatedAt)}</span>
                  {r.offerCount > 0 && r.status === "offered" ? (
                    <span className="font-semibold text-ok">
                      {r.offerCount} {pluralRu(r.offerCount, "предложение", "предложения", "предложений")}
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
