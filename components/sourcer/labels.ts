import type { Tone } from "@/components/ui/badge";
import type { DecodeStatus, FitmentLevel, OfferKind, OfferStatus, RequestStatus } from "@/lib/db/schema";

// Type-only schema imports: this file is also used by client components.

export const QUEUE_TABS = [
  { view: "new", label: "Новые", zh: "新" },
  { view: "mine", label: "Мои", zh: "我的" },
  { view: "clarification", label: "Уточнение", zh: "待确认" },
  { view: "offered", label: "Предложения", zh: "已报价" },
  { view: "all", label: "Все", zh: "全部" },
] as const;

export const REQUEST_STATUS_ZH: Record<RequestStatus, string> = {
  new: "新",
  clarification: "待确认",
  searching: "寻找中",
  offered: "已报价",
  accepted: "已接受",
  closed: "已关闭",
  cancelled: "已取消",
};

export const OFFER_KIND_LABEL: Record<OfferKind, { label: string; zh: string }> = {
  original: { label: "Оригинал", zh: "原厂" },
  oem: { label: "OEM", zh: "配套" },
  aftermarket: { label: "Аналог", zh: "副厂" },
  used: { label: "Б/у", zh: "二手" },
};

export const FITMENT_LABEL: Record<FitmentLevel, { label: string; zh: string; tone: Tone; hint: string }> = {
  vin_confirmed: {
    label: "Подходит по VIN",
    zh: "VIN已核对",
    tone: "ok",
    hint: "Номер есть в каталоге этого VIN, комплектация известна",
  },
  needs_check: { label: "Нужна проверка", zh: "待核对", tone: "warn", hint: "Каталог не подтвердил, клиент увидит предупреждение" },
  manual: { label: "Ручной подбор", zh: "人工匹配", tone: "hand", hint: "Подобрали по описанию и фото" },
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, { label: string; zh: string; tone: Tone }> = {
  draft: { label: "Черновик", zh: "草稿", tone: "neutral" },
  published: { label: "У клиента", zh: "已发布", tone: "ok" },
  withdrawn: { label: "Отозвано", zh: "已撤回", tone: "bad" },
  accepted: { label: "Выбрано клиентом", zh: "已接受", tone: "ok" },
  rejected: { label: "Не выбрано", zh: "未选", tone: "neutral" },
};

export const AXIS_ZH = { front: "前", rear: "后" } as const;
export const SIDE_ZH = { left: "左", right: "右" } as const;

export function decodeLabel(vehicle: { decodeStatus: DecodeStatus; candidates: { id: string }[]; selectedCandidateId: string | null }): {
  label: string;
  zh: string;
  tone: Tone;
} {
  switch (vehicle.decodeStatus) {
    case "decoded":
      return { label: "VIN расшифрован", zh: "已解析", tone: "ok" };
    case "ambiguous":
      return vehicle.selectedCandidateId && vehicle.candidates.some((c) => c.id === vehicle.selectedCandidateId)
        ? { label: "Комплектацию выбрал клиент", zh: "客户已选配置", tone: "ok" }
        : { label: "Несколько комплектаций", zh: "多个配置", tone: "warn" };
    case "unsupported":
      return { label: "Нет каталога", zh: "无目录", tone: "hand" };
    case "manual":
      return { label: "Без VIN", zh: "无VIN", tone: "neutral" };
    default:
      return { label: "VIN не расшифрован", zh: "未解析", tone: "bad" };
  }
}
