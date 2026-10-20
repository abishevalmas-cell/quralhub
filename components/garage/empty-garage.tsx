import Link from "next/link";
import { CarGhost, STAGE_BG } from "@/components/car";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

// The empty garage as an empty stage: a ghost of a car with the stage's "+" in the middle, and the two ways in.
export function EmptyGarage() {
  return (
    <section
      aria-labelledby="empty-garage"
      className={cn("relative isolate grid justify-items-center gap-3 overflow-hidden rounded-[17px] border border-line px-5 py-8 text-center sm:rounded-[22px] sm:py-10", STAGE_BG)}
    >
      <div className="relative w-full max-w-[420px]">
        <CarGhost body="crossover" zone={null} className="opacity-90" />
        <Link
          href="/garage/new"
          aria-label="Добавить машину"
          className="absolute left-1/2 top-[44%] grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-strong text-on-strong shadow-[0_0_0_7px_var(--hotspot-halo),0_6px_18px_rgb(10_20_28/0.25)] transition hover:scale-105 dark:ring-[1.5px] dark:ring-dot/60"
        >
          <Icon name="plus" className="size-6" />
        </Link>
      </div>
      <h2 id="empty-garage" className="text-lg font-bold">
        В гараже пока пусто
      </h2>
      <p className="max-w-md text-muted">
        Добавьте машину по VIN из техпаспорта — откроем каталог производителя, если он есть для вашей марки. VIN нет под рукой? Выберите
        модель из списка.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/garage/new" variant="primary">
          <Icon name="plus" />
          Добавить по VIN
        </ButtonLink>
        <ButtonLink href="/garage/new?mode=model" variant="light">
          Выбрать модель
        </ButtonLink>
      </div>
    </section>
  );
}
