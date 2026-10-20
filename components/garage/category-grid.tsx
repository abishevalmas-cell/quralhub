import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { Category } from "@/lib/providers/types";
import { categoryHref, type Crumb } from "./catalog-links";
import { catalogGroupName } from "./catalog-names";

export function CategoryGrid({ vehicleId, categories, trail }: { vehicleId: string; categories: Category[]; trail: Crumb[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <li key={`${category.level}:${category.code}`}>
          <CategoryLink vehicleId={vehicleId} category={category} trail={trail} />
        </li>
      ))}
    </ul>
  );
}

// The provider's English group name goes under the Russian one, small and muted, for checking against the EPC.
function CategoryLink({ vehicleId, category, trail }: { vehicleId: string; category: Category; trail: Crumb[] }) {
  const name = catalogGroupName(category.name);
  return (
    <Link
      href={categoryHref(vehicleId, category, trail)}
      className="flex h-full items-center justify-between gap-3 rounded-[14px] border border-line bg-card px-4 py-3 transition hover:border-line-strong"
    >
      <span className="grid min-w-0 gap-0.5">
        <span className="font-semibold break-words" lang={name.lang}>
          {name.ru}
        </span>
        {name.original ? (
          <span className="text-xs text-muted break-words" lang="en">
            {name.original}
          </span>
        ) : null}
        {category.remark ? <span className="text-sm text-muted break-words">{category.remark}</span> : null}
        {category.providerFit === false ? <span className="text-sm text-warn">По каталогу не для этого VIN</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
        {category.last ? "Детали" : null}
        <Icon name="arrow" className="size-4" />
      </span>
    </Link>
  );
}
