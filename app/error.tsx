"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

// Any unexpected error inside the layout. The message itself is not shown: it may hold details meant for the server log.
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("tetix page error", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-xl gap-6 pt-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Ошибка</div>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight">Что-то пошло не так</h1>
      </div>
      <EmptyState
        title="Страница не загрузилась"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="primary" onClick={() => retry()}>
              Попробовать ещё раз
            </Button>
            <ButtonLink href="/" variant="soft">
              На главную
            </ButtonLink>
          </div>
        }
      >
        Попробуйте ещё раз через минуту. Заявки, заказы и машины в гараже сохранены.
      </EmptyState>
    </div>
  );
}
