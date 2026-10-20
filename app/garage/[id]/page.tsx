import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CandidatePicker } from "@/components/garage/candidate-picker";
import { requestHref } from "@/components/garage/catalog-links";
import { CategoryGrid } from "@/components/garage/category-grid";
import { CopyButton } from "@/components/garage/copy-button";
import { catalogFailureText, decodeBadge, formatBuildDate, trimChosen, vehicleName, vehicleTitle } from "@/components/garage/labels";
import { Notice } from "@/components/garage/notice";
import { RedecodeButton } from "@/components/garage/redecode-button";
import { VehicleSettings } from "@/components/garage/vehicle-settings";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, KeyValue, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { FIXTURE_NOTICE } from "@/lib/providers";
import { catalogAvailability, catalogSource, getCategories } from "@/lib/services/catalog";
import { getVehicle } from "@/lib/services/vehicles";
import { orNotFound, plainMessage, settle } from "../_lib/load";

export const metadata = { title: "Машина" };

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(`/garage/${id}`)}`);
  const db = await getDb();
  const vehicle = await orNotFound(getVehicle(db, actor, id));
  const availability = catalogAvailability(vehicle);
  const fixtureMode = Boolean(vehicle.vin) && catalogSource() === "fixture";
  const level1 = availability.available ? await settle(getCategories(db, actor, vehicle.id, { level: 1 })) : null;

  const badge = decodeBadge(vehicle);
  const name = vehicleName(vehicle);
  const manual = requestHref(vehicle.id);
  const ambiguous = vehicle.decodeStatus === "ambiguous";
  const chosen = trimChosen(vehicle);
  const catalogOpened = Boolean(level1?.ok && level1.value.ok);
  const manualCta = (variant: "primary" | "soft" = "soft") => (
    <ButtonLink href={manual} variant={variant} size="sm">
      Найдём деталь вручную
    </ButtonLink>
  );

  const notices: ReactNode[] = [];
  if (fixtureMode)
    notices.push(
      <Notice key="fixture" tone="warn" title="Режим примеров: данные синтетические">
        Каталог 17VIN не подключён. Модели, группы и номера деталей здесь выдуманы для проверки сервиса — не заказывайте по ним.
      </Notice>,
    );
  if (vehicle.decodeStatus === "error" || vehicle.decodeStatus === "pending")
    notices.push(
      <Notice key="error" tone="bad" title="VIN пока не расшифрован" action={<RedecodeButton vehicleId={vehicle.id} />}>
        Каталог не ответил или временно недоступен. Повторите позже: сами мы платные запросы не повторяем. Деталь можно найти и без
        каталога — <Link href={manual} className="font-semibold underline">оставьте заявку</Link>.
      </Notice>,
    );
  if (availability.reason === "unsupported")
    notices.push(
      <Notice key="unsupported" tone="hand" title="Каталога для этой машины нет" action={manualCta("primary")}>
        Поставщик каталога не нашёл этот VIN или пока не поддерживает марку. Подборщик найдёт деталь вручную — по VIN, фото и описанию.
      </Notice>,
    );
  if (availability.reason === "no_epc" && vehicle.decodeStatus !== "error" && vehicle.decodeStatus !== "pending")
    notices.push(
      <Notice key="no-epc" tone="hand" title="Каталог недоступен" action={manualCta("primary")}>
        VIN расшифрован, но поставщик не сообщил, в каком каталоге искать детали. Подборщик найдёт деталь вручную.
      </Notice>,
    );
  if (availability.reason === "manual" || availability.reason === "no_vin")
    notices.push(
      <Notice
        key="manual"
        tone="hand"
        title="Машина добавлена без VIN"
        action={
          <>
            {manualCta("primary")}
            <ButtonLink href="/garage/new" variant="ghost" size="sm">
              Добавить по VIN
            </ButtonLink>
          </>
        }
      >
        Каталог открывается только по VIN, поэтому совместимость проверит подборщик. Добавьте VIN из техпаспорта, чтобы смотреть детали
        по каталогу.
      </Notice>,
    );
  // When the catalog then really fails, the notice in the catalog section says it, so this one is not repeated.
  if (availability.reason === "likely_unavailable" && catalogOpened)
    notices.push(
      <Notice key="likely" tone="warn" title="Каталог, вероятно, недоступен" action={manualCta()}>
        По таким VIN поставщик обычно отдаёт пустой каталог — так было со всеми Li Auto и Zeekr при проверке. Попробуйте открыть его
        ниже; если групп нет, подборщик найдёт деталь вручную.
      </Notice>,
    );

  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <Link href="/garage" className="mb-3 inline-block text-sm font-semibold text-muted hover:text-ink">
          ← Гараж
        </Link>
        <PageHeader eyebrow="Гараж" title={vehicleTitle(vehicle)} actions={<Badge tone={badge.tone}>{badge.label}</Badge>}>
          {vehicle.label && name ? [name, vehicle.year].filter(Boolean).join(", ") : null}
        </PageHeader>
      </div>

      {notices}

      <Card>
        <h2 className="mb-2 text-lg font-bold">Данные машины</h2>
        <KeyValue
          items={[
            [
              "VIN",
              vehicle.vin ? (
                <span className="flex flex-wrap items-center gap-x-1">
                  <span className="font-mono break-all">{vehicle.vin}</span>
                  <CopyButton value={vehicle.vin} label="Скопировать VIN" />
                </span>
              ) : (
                "Не указан"
              ),
            ],
            ["Марка", vehicle.brand ?? "—"],
            ["Модель", vehicle.model ?? "—"],
            ["Год", vehicle.year ?? "—"],
            ["Дата выпуска", formatBuildDate(vehicle.buildDate) ?? "—"],
            ["Комплектация", vehicle.trim ?? (ambiguous ? <span className="text-warn">Не выбрана</span> : "—")],
          ]}
        />
      </Card>

      {ambiguous ? (
        <Card className="grid gap-3">
          <div>
            <h2 className="text-lg font-bold">{chosen ? "Ваша комплектация" : "Уточните комплектацию"}</h2>
            <p className="mt-1 text-[15px] text-muted">
              VIN подходит к нескольким комплектациям. Сверьте с табличкой в проёме двери или с техпаспортом.{" "}
              {chosen
                ? "Детали, которые зависят от опций, подборщик всё равно проверит."
                : "Пока комплектация не выбрана, детали отмечены «Нужна проверка»."}
            </p>
          </div>
          <CandidatePicker vehicleId={vehicle.id} candidates={vehicle.candidates} selectedId={vehicle.selectedCandidateId} />
        </Card>
      ) : null}

      {level1 ? (
        <section className="grid gap-3" aria-labelledby="catalog-heading">
          <h2 id="catalog-heading" className="text-lg font-bold">
            Каталог деталей
          </h2>
          {level1.ok && level1.value.ok ? (
            <>
              <CategoryGrid vehicleId={vehicle.id} categories={level1.value.categories} trail={[]} />
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="text-[15px] text-muted">Не нашли деталь в каталоге? Опишите её — подборщик найдёт по VIN.</p>
                {manualCta()}
              </Card>
            </>
          ) : (
            <Notice tone="hand" title="Каталог не открылся" action={manualCta("primary")}>
              {plainMessage(level1.ok ? catalogFailureText(level1.value.status, "catalog") : level1.error.message, FIXTURE_NOTICE)}.
              Подборщик найдёт деталь вручную по VIN.
            </Notice>
          )}
        </section>
      ) : null}

      <VehicleSettings vehicleId={vehicle.id} label={vehicle.label} />
    </div>
  );
}
