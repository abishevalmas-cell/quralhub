import Link from "next/link";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import { SectionHeading } from "@/components/ui/card";
import type { HomeRequest } from "@/lib/services/search";
import { formatDate } from "@/lib/utils";

export function RecentRequests({ requests }: { requests: HomeRequest[] }) {
  return (
    <section aria-labelledby="recent-requests">
      <SectionHeading
        id="recent-requests"
        title="Последние заявки"
        note={
          requests.length ? (
            <Link href="/requests" className="text-sm font-semibold text-ink underline underline-offset-4">
              Все заявки
            </Link>
          ) : null
        }
      />
      {requests.length ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="grid h-full gap-1 rounded-[14px] border border-line bg-card px-4 py-3 transition hover:border-line-strong"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words font-semibold leading-snug">{r.title}</span>
                  <RequestStatusBadge status={r.status} className="mt-0.5 shrink-0" />
                </span>
                <span className="flex flex-wrap gap-x-3 text-sm text-muted">
                  <span>№{r.number}</span>
                  <span>{r.vehicleLabel ?? "Без машины"}</span>
                  <span>{formatDate(r.updatedAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[14px] border border-dashed border-line-strong bg-card px-4 py-5 text-center text-sm text-muted">
          Заявок пока нет. Напишите в поиске, что нужно, — первая заявка займёт минуту.
        </p>
      )}
    </section>
  );
}
