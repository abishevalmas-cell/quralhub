import type { Tone } from "@/components/ui/badge";
import type { CatalogStatus } from "@/lib/catalog";

// How parts are picked for a brand, in the words of the models pages. Source: the 17VIN trial (docs/17vin.md).
// The status belongs to the brand, not to a model: `card` is the softer label of a model card, so a brand-level
// observation is not read as a promise for that model.

export const CATALOG_STATUS: Record<CatalogStatus, { label: string; card: string; tone: Tone; text: string }> = {
  vin_catalog: {
    label: "Каталог по VIN",
    card: "Каталог по VIN у марки",
    tone: "ok",
    text: "Для VIN этой марки в нашем тесте открылся каталог производителя. Добавьте VIN — проверим, откроется ли он для вашей машины.",
  },
  manual: {
    label: "Ручной подбор",
    card: "Ручной подбор",
    tone: "hand",
    text: "Каталога по VIN у поставщика нет. Подборщик ищет деталь по VIN, фото и описанию.",
  },
  checking: {
    label: "Проверяем",
    card: "Каталог проверяем",
    tone: "warn",
    text: "Каталог по VIN ещё не проверяли. Добавьте VIN — сразу увидите, открывается ли он, а номер сверит подборщик.",
  },
};

export const CATALOG_STATUS_ORDER: readonly CatalogStatus[] = ["vin_catalog", "manual", "checking"];
