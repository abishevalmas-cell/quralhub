"use client";

import { useEffect } from "react";
import { StageMessage } from "@/components/layout/stage-message";
import { Button, ButtonLink } from "@/components/ui/button";

// Any unexpected error inside the layout. The message itself is not shown: it may hold details meant for the server log.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("tetix page error", error.digest ?? error.name);
  }, [error]);

  return (
    <StageMessage
      eyebrow="Ошибка"
      title="Что-то пошло не так"
      actions={
        <>
          <Button type="button" variant="primary" onClick={() => retry()}>
            Попробовать ещё раз
          </Button>
          <ButtonLink href="/" variant="light">
            На главную
          </ButtonLink>
        </>
      }
    >
      Страница не загрузилась. Попробуйте ещё раз через минуту: заявки, заказы и машины в гараже сохранены.
    </StageMessage>
  );
}
