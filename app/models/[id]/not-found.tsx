import { StageMessage } from "@/components/layout/stage-message";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Модель не найдена" };

// An unknown /models/<id>: an old link or a typo. The models are public, so this page says what is missing
// and offers the list and a request, not the account wording of the generic 404.
export default function ModelNotFound() {
  return (
    <StageMessage
      eyebrow="Каталог моделей"
      title="Такой модели нет в каталоге"
      actions={
        <>
          <ButtonLink href="/models" variant="primary">
            Все модели
          </ButtonLink>
          <ButtonLink href="/requests/new" variant="light">
            Создать заявку
          </ButtonLink>
        </>
      }
    >
      Возможно, ссылка устарела или модель называется иначе. Найдите её в списке — или опишите машину в заявке: подборщик разберётся
      с любой китайской маркой.
    </StageMessage>
  );
}
