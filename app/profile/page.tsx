import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TelegramCard } from "@/components/home/telegram-card";
import { initials, MODE_LABEL } from "@/components/layout/nav";
import { StatusPill } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getActor } from "@/lib/auth/current";
import { formatPhone } from "@/lib/auth/phone";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { telegramStatus } from "@/lib/services/telegram";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/profile");
  const db = await getDb();
  const [[user], telegram] = await Promise.all([
    db.select().from(users).where(eq(users.id, actor.id)).limit(1),
    telegramStatus(db, actor),
  ]);
  const letters = initials(user.name);
  const phone = formatPhone(user.phone);
  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Аккаунт" title="Профиль" />
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-4 rounded-[18px] border border-line bg-card p-4 sm:p-5">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-strong text-lg font-bold text-strong-lime"
          >
            {letters ?? <Icon name="user" className="size-6" />}
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="truncate text-lg font-bold tracking-[-0.02em]">{user.name?.trim() || "Имя не указано"}</p>
            <p className="text-sm text-muted">
              {phone}
              {user.city ? ` · ${user.city}` : ""}
            </p>
          </div>
          <StatusPill tone="lime">{MODE_LABEL[user.role]}</StatusPill>
        </div>
        <ProfileForm initial={{ name: user.name ?? "", company: user.company ?? "", city: user.city ?? "", role: user.role }} />
        <TelegramCard linked={telegram.linked} url={telegram.url} />
      </div>
    </div>
  );
}
