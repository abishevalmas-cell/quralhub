import { ButtonLink } from "@/components/ui/button";
import { getActor } from "@/lib/auth/current";

// Placeholder home; replaced by the smart search home in the features phase.
export default async function HomePage() {
  const actor = await getActor();
  return (
    <section className="grid gap-4 pt-6">
      <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Запчасти из Китая</div>
      <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-balance">Найдём деталь для вашей китайской машины по VIN, фото или описанию</h1>
      <p className="max-w-xl text-muted">BYD, Li Auto, Zeekr, Geely, Changan, Chery, Haval и другие. Проверяем совместимость и привозим из Китая.</p>
      <div>{actor ? <ButtonLink href="/garage" variant="primary">Открыть гараж</ButtonLink> : <ButtonLink href="/login" variant="primary">Войти по телефону</ButtonLink>}</div>
    </section>
  );
}
