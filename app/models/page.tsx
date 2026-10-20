import Link from "next/link";
import { CATALOG_STATUS, CATALOG_STATUS_ORDER } from "@/components/models/catalog-status";
import { ModelCard } from "@/components/models/model-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { ChipGroup, ChipLink } from "@/components/ui/chip";
import { SearchBox } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { BRANDS, getBrand, MODELS, modelsByBrand, searchModels, type Brand, type CarModel } from "@/lib/catalog";
import { pluralRu } from "@/lib/utils";

export const metadata = { title: "Модели" };

type Query = { q?: string | string[]; brand?: string | string[] };

const first = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
const QUERY_MAX = 60;

// The overview shows the first models of each brand (most common first); the brand filter shows them all.
const OVERVIEW_LIMIT = 4;

const BRAND_ROWS = BRANDS.map((brand) => ({ brand, models: modelsByBrand(brand.id) })).filter((row) => row.models.length);

function modelsHref(params: { q?: string; brand?: string | null }) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.brand) search.set("brand", params.brand);
  return search.size ? `/models?${search}` : "/models";
}

// The model catalog: every car we have a picture and a parts list for, by brand, with how parts are picked.
// Search and the brand filter are plain links and a GET form, so the page works before any script loads.
export default async function ModelsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const q = first(query.q).trim().slice(0, QUERY_MAX);
  const brand = getBrand(first(query.brand));
  const found: CarModel[] | null = q
    ? searchModels(q, MODELS.length).filter((m) => !brand || m.brandId === brand.id)
    : brand
      ? modelsByBrand(brand.id)
      : null;

  return (
    <div>
      <PageHeader eyebrow="Каталог моделей" title="Модели, для которых подбираем детали">
        {MODELS.length} {pluralRu(MODELS.length, "модель", "модели", "моделей")} {BRAND_ROWS.length} китайских марок, популярных в
        Казахстане, Узбекистане, Кыргызстане и России. Откройте модель — покажем схему узлов и детали по группам.
      </PageHeader>

      <form action="/models" role="search" aria-label="Поиск модели" className="mb-4">
        {brand ? <input type="hidden" name="brand" value={brand.id} /> : null}
        <SearchBox
          id="models-q"
          name="q"
          label="Марка или модель"
          defaultValue={q}
          maxLength={QUERY_MAX}
          placeholder="Марка или модель"
          hint="Например: Song Plus, Monjaro, Тигго 7 — можно по-русски и по-китайски"
        >
          <Button variant="primary" className="h-11 shrink-0 rounded-lg px-4 text-[13px] sm:px-5 sm:text-sm">
            Найти
          </Button>
        </SearchBox>
      </form>

      <ChipGroup label="Марки" scroll className="mb-3">
        <ChipLink href={modelsHref({ q })} active={!brand}>
          Все марки
        </ChipLink>
        {BRAND_ROWS.map(({ brand: b, models }) => (
          <ChipLink key={b.id} href={modelsHref({ q, brand: b.id })} active={brand?.id === b.id}>
            {b.name} <span className={brand?.id === b.id ? "text-on-strong/70" : "text-muted"}>{models.length}</span>
          </ChipLink>
        ))}
      </ChipGroup>

      <StatusLegend />

      {found ? (
        <section aria-labelledby="models-found" className="mt-6">
          <h2 id="models-found" className="mb-4 text-lg font-bold tracking-[-0.02em]">
            {found.length
              ? `${q ? "Нашли" : brand?.name}: ${found.length} ${pluralRu(found.length, "модель", "модели", "моделей")}`
              : "Ничего не нашли"}
          </h2>
          {brand && !q ? <BrandNote brand={brand} /> : null}
          {found.length ? (
            <ModelGrid models={found} />
          ) : (
            <EmptyState title="Такой модели в списке нет" level={3}>
              Проверьте написание или добавьте машину по VIN — подборщик разберётся с любой китайской маркой.
            </EmptyState>
          )}
        </section>
      ) : (
        BRAND_ROWS.map(({ brand: b, models }) => (
          <section key={b.id} aria-labelledby={`brand-${b.id}`} className="mt-9">
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 id={`brand-${b.id}`} className="text-xl font-bold tracking-[-0.02em]">
                {b.name}{" "}
                {b.nameZh ? (
                  <span className="zh text-base font-normal text-muted" lang="zh-CN">
                    {b.nameZh}
                  </span>
                ) : null}
              </h2>
              <Badge tone={CATALOG_STATUS[b.catalogStatus].tone}>{CATALOG_STATUS[b.catalogStatus].label}</Badge>
              <span className="text-xs text-muted">
                {models.length} {pluralRu(models.length, "модель", "модели", "моделей")}
              </span>
            </div>
            <ModelGrid models={models.slice(0, OVERVIEW_LIMIT)} showStatus={false} />
            {models.length > OVERVIEW_LIMIT ? (
              <Link
                href={modelsHref({ brand: b.id })}
                className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold underline decoration-1 underline-offset-4 hover:decoration-2"
              >
                Все {models.length} {pluralRu(models.length, "модель", "модели", "моделей")} {b.name}
                <Icon name="arrow" className="size-4" />
              </Link>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}

function ModelGrid({ models, showStatus = true }: { models: CarModel[]; showStatus?: boolean }) {
  return (
    <ul className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2 sm:gap-4 md:grid-cols-4">
      {models.map((m) => (
        <li key={m.id} className="min-w-0">
          <ModelCard model={m} href={`/models/${m.id}`} showStatus={showStatus} />
        </li>
      ))}
    </ul>
  );
}

function StatusLegend() {
  return (
    <ul className="grid gap-2 rounded-[14px] border border-line bg-card p-4 text-sm md:grid-cols-3" aria-label="Как подбираем детали">
      {CATALOG_STATUS_ORDER.map((status) => (
        <li key={status} className="grid content-start gap-1.5">
          <Badge tone={CATALOG_STATUS[status].tone} className="justify-self-start">
            {CATALOG_STATUS[status].label}
          </Badge>
          <span className="text-muted">{CATALOG_STATUS[status].text}</span>
        </li>
      ))}
    </ul>
  );
}

function BrandNote({ brand }: { brand: Brand }) {
  return <p className="-mt-2 mb-4 text-sm text-muted">{brand.note}</p>;
}
