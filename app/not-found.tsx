import { StageMessage } from "@/components/layout/stage-message";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Страница не найдена" };

// Shown for every notFound(): another customer's request or order, an old link, a car removed from the garage.
// The text is the same in all cases, so nobody can tell whether someone else's request exists.
export default function NotFound() {
  return (
    <StageMessage
      eyebrow="Ошибка 404"
      title="Страница не найдена"
      actions={
        <>
          <ButtonLink href="/requests" variant="primary">
            Мои заявки
          </ButtonLink>
          <ButtonLink href="/garage" variant="light">
            Гараж
          </ButtonLink>
          <ButtonLink href="/" variant="light">
            Поиск
          </ButtonLink>
        </>
      }
    >
      Ссылка устарела, страница удалена или открыта из другого аккаунта. Проверьте, что вошли под своим номером.
    </StageMessage>
  );
}
