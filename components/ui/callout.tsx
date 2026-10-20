import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

const tones = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  hand: "bg-hand-bg text-hand",
  neutral: "border border-line bg-card text-ink",
} as const;

// A rounded banner with an icon, a bold line, a short text and actions on the right: "Заявка отправлена",
// "Заказ №12 создан", "Оплата пока принимается вручную". The actions wrap under the text on phones.
export function Callout({
  tone = "neutral",
  icon,
  title,
  children,
  action,
  role,
  id,
  className,
}: {
  tone?: keyof typeof tones;
  icon?: IconName;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
  id?: string;
  className?: string;
}) {
  return (
    <div id={id} role={role} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] p-4 sm:px-5", tones[tone], className)}>
      <div className="flex min-w-0 flex-[1_1_15rem] items-start gap-3">
        {icon ? (
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-card/75">
            <Icon name={icon} className="size-5" />
          </span>
        ) : null}
        <div className="grid min-w-0 gap-1 self-center">
          {title ? <p className="font-bold">{title}</p> : null}
          {children ? <div className="text-sm [&_a]:font-semibold [&_a]:underline">{children}</div> : null}
        </div>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}
