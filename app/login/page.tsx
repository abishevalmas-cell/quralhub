import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/current";
import { safeNextPath } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = safeNextPath(next);
  if (await getActor()) redirect(safeNext);
  return (
    <div className="mx-auto grid max-w-md gap-6 pt-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Вход и регистрация</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Войдите по номеру телефона</h1>
        <p className="mt-2 text-muted">Пришлём код. Гараж, заявки и заказы сохранятся в аккаунте.</p>
      </div>
      <LoginForm next={safeNext} />
    </div>
  );
}
