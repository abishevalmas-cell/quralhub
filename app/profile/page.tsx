import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { formatPhone } from "@/lib/auth/phone";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Профиль" };

export default async function ProfilePage() {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/profile");
  const [user] = await (await getDb()).select().from(users).where(eq(users.id, actor.id)).limit(1);
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader eyebrow="Аккаунт" title="Профиль">
        {formatPhone(user.phone)}
      </PageHeader>
      <ProfileForm initial={{ name: user.name ?? "", company: user.company ?? "", city: user.city ?? "", role: user.role }} />
    </div>
  );
}
