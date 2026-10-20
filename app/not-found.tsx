import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export const metadata = { title: "Страница не найдена" };

// Shown for every notFound(): another customer's request or order, an old link, a car removed from the garage.
// The text is the same in all cases, so nobody can tell whether someone else's request exists.
export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-xl gap-6 pt-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Ошибка 404</div>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">Страница не найдена</h1>
      </div>
      <EmptyState
        title="Здесь ничего нет"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/requests" variant="primary">
              Мои заявки
            </ButtonLink>
            <ButtonLink href="/garage" variant="soft">
              Гараж
            </ButtonLink>
            <ButtonLink href="/" variant="soft">
              Поиск
            </ButtonLink>
          </div>
        }
      >
        Ссылка устарела, страница удалена или открыта из другого аккаунта. Проверьте, что вошли под своим номером.
      </EmptyState>
    </div>
  );
}
