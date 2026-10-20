import { CarThumb } from "@/components/car";
import type { CarLook } from "@/components/garage/garage-car";
import { Icon, type IconName } from "@/components/ui/icon";

// The picture on the left of a request or order card: the customer's car, or an icon tile for a request without one.
export function CarMedia({ look, icon = "clipboard" }: { look: CarLook | null; icon?: IconName }) {
  if (look) return <CarThumb body={look.body} color={look.color} />;
  return (
    <div aria-hidden="true" className="grid aspect-[740/282] place-items-center rounded-xl bg-soft text-muted">
      <Icon name={icon} className="size-6" />
    </div>
  );
}
