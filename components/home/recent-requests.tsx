import Link from "next/link";
import { RequestStatusBadge } from "@/components/requests/request-status-badge";
import type { HomeRequest } from "@/lib/services/search";
import { formatDate } from "@/lib/utils";

export function RecentRequests({ requests }: { requests: HomeRequest[] }) {
  return (
    <section aria-labelledby="recent-requests" className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-requests" className="text-lg font-extrabold tracking-tight">
          Последние заявки
        </h2>
        {requests.length ? (
          <Link href="/requests" className="text-sm font-semibold text-muted underline hover:text-ink">
            Все заявки
          </Link>
        ) : null}
      </div>
      {requests.length ? (
        <ul className="grid gap-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/requests/${r.id}`}
                className="grid gap-1 rounded-2xl border border-line bg-card px-4 py-3 transition hover:border-muted"
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
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-5 text-center text-sm text-muted">
          Заявок пока нет. Напишите в поиске, что нужно, — первая заявка займёт минуту.
        </p>
      )}
    </section>
  );
}
