import Link from "next/link";
import { FindForMe } from "@/components/home/find-for-me";
import { Landing } from "@/components/home/landing";
import { RecentRequests } from "@/components/home/recent-requests";
import { SmartSearch } from "@/components/home/smart-search";
import { Icon } from "@/components/ui/icon";
import { getActor } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { homeData } from "@/lib/services/search";

export default async function HomePage() {
  const actor = await getActor();
  if (!actor) return <Landing />;
  // homeData returns only id, title and catalog mode per car: the search box is a client component.
  const { vehicles, requests } = await homeData(await getDb(), actor);

  return (
    <div className="mx-auto grid max-w-3xl gap-8">
      <section className="grid gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            {actor.name ? `Здравствуйте, ${actor.name}` : "Поиск запчастей"}
          </div>
          <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight sm:text-[32px]">Что нужно найти?</h1>
        </div>
        <SmartSearch signedIn vehicles={vehicles} />
      </section>

      {isStaff(actor) ? (
        <Link href="/sourcer" className="flex items-center gap-3 rounded-2xl bg-soft px-4 py-3 font-semibold transition hover:bg-line">
          <Icon name="queue" />
          <span className="flex-1">
            Очередь подбора <span className="zh font-normal text-muted">采购</span>
          </span>
          <Icon name="arrow" className="text-muted" />
        </Link>
      ) : null}

      <RecentRequests requests={requests} />
      <FindForMe vehicleIds={vehicles.map((v) => v.id)} />
    </div>
  );
}
