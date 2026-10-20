import type { ReactNode } from "react";
import { CarIllustration, STAGE_BG } from "@/components/car";
import { cn } from "@/lib/utils";

// A whole-page message on the stage backdrop with a car standing below it: "Страница не найдена", an error.
// Server-safe (no directive), so the client error page can use it too.
export function StageMessage({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section
      aria-labelledby="stage-message-title"
      className={cn("relative isolate mx-auto max-w-[980px] overflow-hidden rounded-[17px] border border-line px-4 pt-9 sm:rounded-[22px] sm:px-10 sm:pt-12", STAGE_BG)}
    >
      <div className="mx-auto grid max-w-lg justify-items-center gap-3 text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="stage-message-title" className="text-[27px] font-bold leading-[1.18] tracking-[-0.03em] text-balance sm:text-[34px]">
          {title}
        </h1>
        {children ? <div className="max-w-md text-[15px] text-muted">{children}</div> : null}
        {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </div>
      <div aria-hidden="true" className="pointer-events-none mx-auto mt-6 w-[86%] max-w-[480px] pb-5 sm:pb-8">
        <CarIllustration body="crossover" color="#b9c3c9" decorative tight />
      </div>
    </section>
  );
}
