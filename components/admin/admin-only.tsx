import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export function AdminOnly() {
  return (
    <div className="mx-auto max-w-xl">
      <EmptyState title="Раздел для администратора" action={<ButtonLink href="/">На главную</ButtonLink>}>
        Роли сотрудников, цены и доступ к каталогу меняет администратор. Если вам нужен доступ, напишите ему.
      </EmptyState>
    </div>
  );
}
