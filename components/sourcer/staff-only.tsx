import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export function StaffOnly() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Раздел для подборщиков" action={<ButtonLink href="/requests">Мои заявки</ButtonLink>}>
        Доступ выдаёт администратор. Свои заявки на детали вы найдёте в разделе «Заявки».
      </EmptyState>
    </div>
  );
}
