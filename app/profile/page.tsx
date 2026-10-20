import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TelegramCard } from "@/components/home/telegram-card";
import { PageHeader } from "@/components/ui/card";
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
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Аккаунт" title="Профиль">
        {formatPhone(user.phone)}
      </PageHeader>
      <div className="grid gap-6">
        <ProfileForm initial={{ name: user.name ?? "", company: user.company ?? "", city: user.city ?? "", role: user.role }} />
        <TelegramCard linked={telegram.linked} url={telegram.url} />
      </div>
    </div>
  );
}
