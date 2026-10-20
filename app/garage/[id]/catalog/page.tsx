import Link from "next/link";
import { catalogGroupName } from "@/components/garage/catalog-names";
import { redirect } from "next/navigation";
import { MAX_LEVEL, catalogHref, crumbHref, parseTrail, requestHref, type Crumb } from "@/components/garage/catalog-links";
import { CategoryGrid } from "@/components/garage/category-grid";
import { catalogFailureText, vehicleTitle } from "@/components/garage/labels";
import { Notice } from "@/components/garage/notice";
import { PartList } from "@/components/garage/part-list";
import { ButtonLink } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { getActor } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { FIXTURE_NOTICE } from "@/lib/providers";
import { catalogAvailability, getCategories, getParts } from "@/lib/services/catalog";
import { getVehicle } from "@/lib/services/vehicles";
import { orNotFound, plainMessage, settle } from "../../_lib/load";

export const metadata = { title: "Каталог деталей" };

type Query = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim() : undefined) || undefined;

export default async function CatalogPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Query> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const level = Number(one(query.level) ?? "1");
  const code = one(query.code);
  const parent = one(query.parent);
  const actor = await getActor();
  if (!actor) {
    const keep = new URLSearchParams();
    for (const key of ["level", "parent", "code", "trail"]) {
      const value = one(query[key]);
      if (value) keep.set(key, value.slice(0, 2000));
    }
    redirect(`/login?next=${encodeURIComponent(`/garage/${id}/catalog${keep.size ? `?${keep}` : ""}`)}`);
  }
  const db = await getDb();
  const vehicle = await orNotFound(getVehicle(db, actor, id));
  const availability = catalogAvailability(vehicle);

  // The trail only names the groups above; if it does not end at the group on screen it is replaced.
  const current = code ?? (level > 1 ? parent : undefined);
  let trail: Crumb[] = parseTrail(query.trail);
  if (current ? trail.at(-1)?.code !== current : trail.length > 0)
    trail = current ? [{ code: current, name: current, level: code ? level : level - 1 }] : [];

  const manual = requestHref(vehicle.id);
  const manualCta = (variant: "primary" | "soft" = "soft") => (
    <ButtonLink href={manual} variant={variant} size="sm">
      Найдём деталь вручную
    </ButtonLink>
  );

  const parts = availability.available && code ? await settle(getParts(db, actor, vehicle.id, { categoryCode: code, level })) : null;
  const groups =
    availability.available && !code ? await settle(getCategories(db, actor, vehicle.id, { level, parentCode: parent })) : null;
  const answer = parts ?? groups;
  const source = answer?.ok ? answer.value.source : null;
  // Our own refusals (a daily limit) are written for customers; provider answers are mapped to plain copy.
  const failure =
    answer && (!answer.ok || !answer.value.ok)
      ? answer.ok
        ? catalogFailureText(answer.value.status, code ? "group" : "catalog")
        : answer.error.message
      : null;

  return (
    <div className="grid max-w-5xl gap-5">
      <nav aria-label="Путь по каталогу" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-muted">
          <li>
            <Link href={`/garage/${vehicle.id}`} className="font-semibold hover:text-ink">
              {vehicleTitle(vehicle)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {trail.length ? (
              <Link href={catalogHref(vehicle.id, { level: 1 })} className="font-semibold hover:text-ink">
                Каталог
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold text-ink">
                Каталог
              </span>
            )}
          </li>
          {trail.map((crumb, index) => (
            <li key={`${crumb.level}:${crumb.code}`} className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden="true">/</span>
              {index === trail.length - 1 ? (
                <span aria-current="page" className="font-semibold break-words text-ink" lang={catalogGroupName(crumb.name).lang}>
                  {catalogGroupName(crumb.name).ru}
                </span>
              ) : (
                <Link href={crumbHref(vehicle.id, trail, index)} className="font-semibold break-words hover:text-ink" lang={catalogGroupName(crumb.name).lang}>
                  {catalogGroupName(crumb.name).ru}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <PageHeader
        eyebrow={code ? "Детали группы" : Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL ? `Каталог · уровень ${level}` : "Каталог"}
        title={trail.length ? catalogGroupName(trail.at(-1)?.name).ru : "Каталог деталей"}
      />

      {source === "fixture" ? (
        <Notice tone="warn" title="Режим примеров: данные синтетические">
          Каталог 17VIN не подключён. Группы и номера деталей здесь выдуманы для проверки сервиса — не заказывайте по ним.
        </Notice>
      ) : null}

      {availability.reason === "likely_unavailable" && !failure ? (
        <Notice tone="warn" title="Каталог, вероятно, неполный">
          По таким VIN поставщик часто отдаёт пустой каталог. Если нужной детали нет, подборщик найдёт её вручную.
        </Notice>
      ) : null}

      {!availability.available ? (
        <Notice tone="hand" title="Каталог для этой машины недоступен" action={manualCta("primary")}>
          {availability.reason === "manual" || availability.reason === "no_vin"
            ? "Машина добавлена без VIN, а каталог открывается только по VIN."
            : availability.reason === "unsupported"
              ? "Поставщик каталога не нашёл этот VIN или пока не поддерживает марку."
              : "VIN ещё не расшифрован. Повторите расшифровку на странице машины."}{" "}
          Подборщик найдёт деталь вручную — по VIN, фото и описанию.
        </Notice>
      ) : failure ? (
        <Notice tone="hand" title={code ? "Детали не загрузились" : "Группы не загрузились"} action={manualCta("primary")}>
          {plainMessage(failure, FIXTURE_NOTICE)}. Подборщик найдёт деталь вручную по VIN.
        </Notice>
      ) : null}

      {parts?.ok && parts.value.ok ? (
        <>
          <p className="text-sm text-muted">
            «Подходит по VIN» — номер есть в каталоге вашего VIN и комплектация однозначна. «Нужна проверка» — каталог этого не
            подтвердил: подборщик сверит номер, а в предложении будет видно, подтверждена ли совместимость.
          </p>
          <PartList vehicleId={vehicle.id} parts={parts.value.parts} />
        </>
      ) : null}

      {groups?.ok && groups.value.ok ? <CategoryGrid vehicleId={vehicle.id} categories={groups.value.categories} trail={trail} /> : null}

      {answer && !failure ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-[15px] text-muted">Не нашли нужную деталь? Опишите её — подборщик найдёт по VIN.</p>
          {manualCta()}
        </Card>
      ) : null}
    </div>
  );
}
