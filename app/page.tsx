import { FindForMe } from "@/components/home/find-for-me";
import { HomeExplorer } from "@/components/home/home-explorer";
import { HowItWorks, MasterBanner } from "@/components/home/landing";
import { RecentRequests } from "@/components/home/recent-requests";
import { TelegramCard } from "@/components/home/telegram-card";
import { ButtonLink } from "@/components/ui/button";
import { getActor } from "@/lib/auth/current";
import { isStaff } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { homeData } from "@/lib/services/search";
import { telegramStatus } from "@/lib/services/telegram";

// The original Tetix home: the car on its stage, the search and the parts assortment. Signed-in customers get their
// garage on the stage and their latest requests below; visitors browse catalog models (?model=).
export default async function HomePage() {
  const actor = await getActor();
  if (!actor)
    return (
      <>
        <HomeExplorer signedIn={false} cars={[]} />
        <MasterBanner signedIn={false} />
        <HowItWorks />
      </>
    );

  const db = await getDb();
  // homeData leaves the VIN out: the stage and the search are client components.
  const [{ vehicles, requests }, telegram] = await Promise.all([homeData(db, actor), telegramStatus(db, actor)]);
  const staff = isStaff(actor);

  return (
    <>
      <HomeExplorer signedIn cars={vehicles} />
      {actor.role === "customer" ? <MasterBanner signedIn /> : null}
      {staff ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-line bg-card p-[18px] sm:p-[22px]">
          <p className="font-bold">
            Заявки клиентов ждут подбора <span className="zh font-normal text-muted">采购</span>
          </p>
          <ButtonLink href="/sourcer" variant="strong">
            Открыть очередь
          </ButtonLink>
        </div>
      ) : null}
      <RecentRequests requests={requests} />
      <FindForMe vehicleIds={vehicles.map((v) => v.id)} />
      {/* Only a nudge while the bot is set up and not linked yet; the profile always has the card. */}
      {telegram.url && !telegram.linked ? (
        <div className="mt-3">
          <TelegramCard linked={telegram.linked} url={telegram.url} />
        </div>
      ) : null}
    </>
  );
}
