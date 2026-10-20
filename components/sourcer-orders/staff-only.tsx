import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/card";

export function StaffOnly() {
  return (
    <div className="max-w-xl">
      <EmptyState title="Раздел для подборщиков" action={<ButtonLink href="/orders">Мои заказы</ButtonLink>}>
        Доступ выдаёт администратор. Свои заказы вы найдёте в разделе «Заказы».
      </EmptyState>
    </div>
  );
}
