import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BODY_LABELS } from "@/components/car";
import { loginHref } from "@/components/home/links";
import { AssortmentGrid } from "@/components/models/assortment-grid";
import { CATALOG_STATUS } from "@/components/models/catalog-status";
import { marketsText, ModelCard } from "@/components/models/model-card";
import { ModelShowcase } from "@/components/models/model-showcase";
import { modelSubject, powertrainText } from "@/components/models/subject";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, KeyValue, PageHeader, SectionHeading } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getActor } from "@/lib/auth/current";
import { getBrand, getModel, modelsByBrand, modelTitle, modelYears } from "@/lib/catalog";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params) {
  const model = getModel((await params).id);
  return { title: model ? modelTitle(model) : "Модель не найдена" };
}

// One catalog model: the stage with paints to try, facts, how parts are picked for the brand and the assortment by
// group. Everything here is reference data for choosing; which part fits a car is checked by its VIN.
export default async function ModelPage({ params }: Params) {
  const model = getModel((await params).id);
  if (!model) notFound();
  const actor = await getActor();
  const signedIn = Boolean(actor);
  const brand = getBrand(model.brandId);
  const status = CATALOG_STATUS[brand?.catalogStatus ?? "checking"];
  const title = modelTitle(model);
  const garageHref = `/garage/new?model=${encodeURIComponent(model.id)}`;
  const requestHref = `/requests/new?${new URLSearchParams({ q: `Для ${title}` })}`;
  // The brand's own note when it says more than the status: "проверен в тесте 17VIN", "сборка в России".
  const brandNote = brand && !brand.note.startsWith("Каталог по VIN ещё не проверяли") ? brand.note : null;
  const siblings = modelsByBrand(model.brandId).filter((m) => m.id !== model.id).slice(0, 4);

  return (
    <div className="grid gap-5 [&>*]:min-w-0">
      <div>
        <Link href="/models" className="mb-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <Icon name="chevron-left" className="size-4" />
          Все модели
        </Link>
        <PageHeader
          eyebrow={
            <>
              {model.brand}
              {model.brandZh ? (
                <span className="zh ml-2 normal-case tracking-normal" lang="zh-CN">
                  {model.brandZh}
                </span>
              ) : null}
            </>
          }
          title={title}
          actions={
            <>
              <ButtonLink href={signedIn ? garageHref : loginHref(garageHref)} variant="primary">
                <Icon name="plus" />
                Добавить в гараж
              </ButtonLink>
              <ButtonLink href={signedIn ? requestHref : loginHref(requestHref)} variant="strong">
                Подобрать деталь
              </ButtonLink>
            </>
          }
        >
          {model.modelZh ? (
            <span className="zh" lang="zh-CN">
              {model.modelZh}
            </span>
          ) : null}
        </PageHeader>
      </div>

      <ModelShowcase modelId={model.id} signedIn={signedIn} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-2 text-lg font-bold">О модели</h2>
          <KeyValue
            items={[
              ...(model.modelZh
                ? ([["Название в Китае", <span key="zh" className="zh" lang="zh-CN">{model.modelZh}</span>]] as [string, ReactNode][])
                : []),
              ["Годы", modelYears(model)],
              ["Кузов", BODY_LABELS[model.body]],
              ["Силовая установка", powertrainText(model.powertrains)],
              ["Класс", model.segment ?? "—"],
              ["Популярна", marketsText(model)],
              ...(model.aliases.length ? ([["Другие названия", model.aliases.join(", ")]] as [string, string][]) : []),
            ]}
          />
          <p className="mt-3 text-xs text-muted">
            Справочные данные о модельном ряде. Комплектацию и годы конкретной машины покажет расшифровка VIN.
          </p>
        </Card>
        <Card className="grid content-start gap-3">
          <h2 className="text-lg font-bold">Как подбираем детали</h2>
          <Badge tone={status.tone} className="justify-self-start">
            {status.label}
          </Badge>
          <p className="text-[15px]">{status.text}</p>
          {brandNote ? <p className="text-sm text-muted">{brandNote}</p> : null}
          <p className="text-sm text-muted">
            Цена — после подбора: подборщик находит деталь в Китае и называет цену в ₸ с доставкой, обычно 8–20 дней.
          </p>
        </Card>
      </div>

      <AssortmentGrid subject={modelSubject(model)} signedIn={signedIn} title={`Детали для ${title}`} />

      {siblings.length ? (
        <section aria-labelledby="siblings">
          <SectionHeading id="siblings" title={`Другие модели ${model.brand}`} note={<Link href={`/models?brand=${model.brandId}`} className="font-semibold text-ink underline underline-offset-4">Все</Link>} />
          <ul className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {siblings.map((m) => (
              <li key={m.id} className="min-w-0">
                <ModelCard model={m} href={`/models/${m.id}`} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
