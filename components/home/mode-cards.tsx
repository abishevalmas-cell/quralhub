"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { focusStage } from "@/components/models/stage-explorer";
import { Icon, type IconName } from "@/components/ui/icon";
import { stashPhotos } from "./handoff";
import { loginHref, photoRequestHref } from "./links";

// The three ways in of the original design: by VIN, by photo, visually from the car picture.
const card =
  "group flex min-w-0 flex-col items-center gap-2 rounded-[10px] border border-line bg-card px-1.5 py-3.5 text-center transition hover:border-[#aaba87] hover:bg-[color-mix(in_oklab,var(--lime)_6%,var(--card))] sm:flex-row sm:gap-4 sm:rounded-xl sm:p-5 sm:text-left";

export function ModeCards({
  signedIn,
  vehicleId,
  extra,
}: {
  signedIn: boolean;
  vehicleId: string | null;
  /** Request parameters for the photo request, e.g. the model being browsed. */
  extra?: [string, string][];
}) {
  const router = useRouter();

  function pickPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    stashPhotos(files);
    const target = photoRequestHref(vehicleId, extra ?? []);
    router.push(signedIn ? target : loginHref(target));
  }

  return (
    <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Как искать деталь">
      <li className="min-w-0">
        <Link href="/garage/new" className={`${card} h-full`}>
          <Body icon="scan" title="По VIN-коду" text="Уточнить автомобиль" />
        </Link>
      </li>
      <li className="relative min-w-0">
        <input id="mode-photo" type="file" accept="image/*" multiple className="peer sr-only" onChange={pickPhotos} />
        <label
          htmlFor="mode-photo"
          className={`${card} h-full cursor-pointer peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime-ink`}
        >
          <Body icon="camera" title="По фотографии" text="Деталь, маркировка, повреждение" />
        </label>
      </li>
      <li className="min-w-0">
        <button type="button" onClick={focusStage} className={`${card} h-full w-full`}>
          <Body icon="grid" title="Визуально" text="От области к детали" />
        </button>
      </li>
    </ul>
  );
}

function Body({ icon, title, text }: { icon: IconName; title: ReactNode; text: ReactNode }) {
  return (
    <>
      <span className="grid size-7 shrink-0 place-items-center rounded-[10px] text-ink sm:size-[42px] sm:bg-soft">
        <Icon name={icon} />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="text-xs font-bold leading-tight sm:text-sm">{title}</span>
        <span className="hidden text-xs text-muted md:block">{text}</span>
      </span>
    </>
  );
}
