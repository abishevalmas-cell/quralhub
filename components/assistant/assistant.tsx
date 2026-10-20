"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { showAssistant } from "@/components/layout/nav";
import { SmartSearch } from "@/components/home/smart-search";
import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { HomeVehicle } from "@/lib/services/search";

// The search box's input on the home page. When it is already on screen, the button leads there instead of
// opening a second copy: SmartSearch uses fixed element ids, and two copies would share them.
const PAGE_SEARCH_ID = "home-search";

function focusPageSearch(): boolean {
  const input = document.getElementById(PAGE_SEARCH_ID);
  if (!(input instanceof HTMLInputElement) || input.closest("dialog")) return false;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  input.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  input.focus({ preventScroll: true });
  return true;
}

const OPEN_EVENT = "tetix:assistant";
const openAssistant = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** The phone header's round "Помочь с подбором": phones get no floating button, so it never covers a card. */
export function AssistantHeaderButton() {
  const path = usePathname();
  if (!showAssistant(path)) return null;
  return (
    <button
      type="button"
      onClick={openAssistant}
      aria-haspopup="dialog"
      aria-label="Помочь с подбором"
      className="grid size-9 shrink-0 place-items-center rounded-full bg-strong text-strong-lime transition hover:opacity-90 sm:size-10 lg:hidden"
    >
      <Icon name="spark" className="size-[19px]" />
    </button>
  );
}

/**
 * The graphite "Помочь с подбором" pill of the original, docked at the foot of the desktop sidebar: floating over
 * the page it covered the mode cards, the counters and the part cards.
 */
export function AssistantSidebarButton() {
  const path = usePathname();
  if (!showAssistant(path)) return null;
  return (
    <button
      type="button"
      onClick={openAssistant}
      aria-haspopup="dialog"
      className="flex min-h-12 w-full items-center gap-2 whitespace-nowrap rounded-[40px] bg-strong px-3.5 text-left text-[13px] font-semibold text-strong-lime shadow-float transition hover:-translate-y-0.5 dark:ring-1 dark:ring-line-strong"
    >
      <Icon name="spark" className="size-5" />
      Помочь с подбором
    </button>
  );
}

// "Помочь с подбором" opens a modal dialog with the smart search and a way to describe the task in a request. The
// buttons live in the phone header and the desktop sidebar; this component owns the dialog.
export function Assistant({ signedIn, vehicles }: { signedIn: boolean; vehicles: HomeVehicle[] }) {
  const path = usePathname();
  // The dialog belongs to the page it was opened on: navigating away (a search result, a link) closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn !== null && openOn === path;
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onOpen = () => {
      if (!focusPageSearch()) setOpenOn(window.location.pathname);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      node.querySelector<HTMLInputElement>("input[type=search]")?.focus();
    } else if (!open && node.open) node.close();
  }, [open]);

  if (!showAssistant(path)) return null;

  return (
    <>
      <dialog
        ref={dialog}
        className="sheet p-0"
        aria-labelledby="assistant-title"
        onClose={() => setOpenOn(null)}
        // A click on the backdrop lands on the dialog element itself; clicks inside land on its content.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        {open ? (
          <div className="grid gap-4 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="eyebrow">Подбор</div>
                <h2 id="assistant-title" className="mt-1.5 text-[23px] font-bold leading-tight tracking-[-0.03em] sm:text-[26px]">
                  Помочь с подбором
                </h2>
              </div>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => dialog.current?.close()}
                className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full transition hover:bg-soft"
              >
                <Icon name="close" />
              </button>
            </div>
            <p className="text-sm text-muted">
              Введите VIN, номер детали или напишите, что сломалось. Подборщик проверит совместимость по VIN и назовёт цену
              в ₸ — покупаем только после вашего выбора.
            </p>
            <SmartSearch signedIn={signedIn} vehicles={vehicles} />
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-soft p-4 text-sm">
              <span className="min-w-48 flex-1">Не знаете, как называется деталь? Опишите словами и приложите фото.</span>
              <ButtonLink href="/requests/new" size="sm" variant="dark">
                Описать задачу
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
