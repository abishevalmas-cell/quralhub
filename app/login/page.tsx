import { redirect } from "next/navigation";
import { CarIllustration, STAGE_BG } from "@/components/car";
import { carColorById } from "@/components/car/colors";
import { Wordmark } from "@/components/layout/wordmark";
import { Icon, type IconName } from "@/components/ui/icon";
import { getActor } from "@/lib/auth/current";
import { cn, safeNextPath } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

const PERKS: { icon: IconName; text: string }[] = [
  { icon: "car", text: "Гараж с вашими машинами" },
  { icon: "clipboard", text: "Заявки и варианты с ценой" },
  { icon: "truck", text: "Статус доставки из Китая" },
];

// The sign-in card on the stage backdrop of the home page, with the wordmark and a car standing below it.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);
  if (await getActor()) redirect(safeNext);
  return (
    <section
      aria-labelledby="login-title"
      className={cn("relative isolate mx-auto max-w-[980px] overflow-hidden rounded-[17px] border border-line px-4 pb-0 pt-8 sm:rounded-[22px] sm:px-10 sm:pt-12", STAGE_BG)}
    >
      <div className="mx-auto grid max-w-[420px] gap-6">
        <div className="grid justify-items-center gap-2 text-center">
          <Wordmark />
          <p className="eyebrow mt-4">Вход и регистрация</p>
          <h1 id="login-title" className="text-[25px] font-bold leading-[1.18] tracking-[-0.03em] text-balance sm:text-[30px]">
            Войдите по номеру телефона
          </h1>
          <p className="max-w-sm text-[15px] text-muted">Пришлём код. Гараж, заявки и заказы сохранятся в аккаунте.</p>
        </div>
        <LoginForm next={safeNext} />
        <ul className="grid gap-2 text-[13px] text-muted sm:grid-cols-3 sm:gap-3">
          {PERKS.map((perk) => (
            <li key={perk.text} className="flex items-center gap-2 sm:flex-col sm:text-center">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-card text-ink">
                <Icon name={perk.icon} className="size-4" />
              </span>
              {perk.text}
            </li>
          ))}
        </ul>
      </div>
      <div className="pointer-events-none mx-auto mt-4 w-[88%] max-w-[520px] pb-5 sm:mt-2 sm:pb-8" aria-hidden="true">
        <CarIllustration body="crossover" color={carColorById("zeekr-green")?.hex ?? "#8fb1ad"} decorative tight />
      </div>
    </section>
  );
}
