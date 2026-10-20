import { redirect } from "next/navigation";
import { AdminOnly } from "@/components/admin/admin-only";
import { PricingForm } from "@/components/admin/pricing-form";
import { ProviderPanel } from "@/components/admin/provider-panel";
import { AdminSection, SectionNav } from "@/components/admin/section-nav";
import { Summary } from "@/components/admin/summary";
import { UsersSection } from "@/components/admin/users-section";
import { PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { isAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  astanaDate,
  dashboard,
  getPricing,
  isRoleFilter,
  listUsers,
  providerStatus,
  USER_SEARCH_MAX,
} from "@/lib/services/admin";

export const metadata = { title: "Управление" };

type Props = { searchParams: Promise<{ q?: string | string[]; role?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function AdminPage({ searchParams }: Props) {
  const actor = await getActor();
  if (!actor) redirect("/login?next=/admin");
  if (!isAdmin(actor)) return <AdminOnly />;

  const params = await searchParams;
  const q = first(params.q).replace(/\s+/g, " ").trim().slice(0, USER_SEARCH_MAX);
  const rawRole = first(params.role);
  // An unknown role in the URL shows everyone instead of an error page.
  const role = isRoleFilter(rawRole) ? rawRole : "";
  const db = await getDb();
  const now = new Date();
  const [summary, people, pricing, provider] = await Promise.all([
    dashboard(db, actor, now),
    listUsers(db, actor, { q, role }),
    getPricing(db, actor),
    providerStatus(db, actor, { now }),
  ]);

  return (
    <div>
      <PageHeader eyebrow="Администратор" title="Управление">
        Заявки и заказы, роли сотрудников, формула цены и доступ к каталогу 17VIN.
      </PageHeader>
      <SectionNav />
      <div className="grid gap-12">
        <AdminSection id="summary" description="Все заявки, заказы и пользователи на эту минуту.">
          <Summary data={summary} />
        </AdminSection>
        <AdminSection
          id="users"
          description="Клиент и мастер переключают режим сами в профиле. Роли подборщика и администратора выдаёте вы. Изменение действует сразу."
        >
          <UsersSection actorId={actor.id} users={people.users} truncated={people.truncated} q={q} role={role} />
        </AdminSection>
        <AdminSection
          id="pricing"
          description="По этим значениям считается цена в тенге, когда подборщик вводит цену детали в юанях и её вес."
        >
          <PricingForm initial={pricing} today={astanaDate(now)} />
        </AdminSection>
        <AdminSection id="provider" description="Расшифровка VIN и каталог запчастей. Запросы к 17VIN платные, поэтому у них есть дневной лимит.">
          <ProviderPanel report={provider} />
        </AdminSection>
      </div>
    </div>
  );
}
