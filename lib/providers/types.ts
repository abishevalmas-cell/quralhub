import type { VehicleCandidate } from "@/lib/db/schema";

export type { VehicleCandidate };

export const PROVIDER_STATUSES = [
  "success",
  "empty",
  "unsupported",
  "invalid",
  "auth",
  "quota_or_expired",
  "rate_limit",
  "timeout",
  "network",
  "malformed",
  "not_configured",
  "provider_error",
] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

// Answers worth keeping: the provider really said "here it is", "nothing" or "not supported".
// Transport and account errors are never cached.
export const CACHEABLE_STATUSES: readonly ProviderStatus[] = ["success", "empty", "unsupported"];

export function isProviderStatus(value: unknown): value is ProviderStatus {
  return typeof value === "string" && (PROVIDER_STATUSES as readonly string[]).includes(value);
}

export type ProviderMode = "live" | "fixture";
export type ProviderSource = "provider" | "fixture";
export type ProviderOperation = "decode" | "categories" | "parts" | "oe";

export type ProviderMeta = {
  status: ProviderStatus;
  message: string;
  providerCode?: number;
  // The provider's own "msg" for diagnostics and staff screens: control characters removed, VINs and other
  // long tokens masked, at most PROVIDER_MESSAGE_MAX characters. Customers are shown `message` instead.
  providerMessage?: string;
  source: ProviderSource;
  // Set by the gateway: true when the answer came from provider_cache.
  cached?: boolean;
};

// Every result carries its payload fields even on errors (empty arrays), so callers never branch on undefined.
export type ProviderResult<T> = ProviderMeta & T;

export type DecodeData = {
  epc?: string;
  epcId?: string;
  matchingMode?: string;
  buildDate?: string;
  manufacturedIn?: string;
  candidates: VehicleCandidate[];
  // More than one trim candidate: the customer or a sourcer must choose; never pick the first one.
  ambiguous: boolean;
};
export type DecodeResult = ProviderResult<DecodeData>;

// 17VIN catalogs are up to four levels deep (cata1…cata4); parts are read from the last level of a branch.
export const CATEGORY_LEVELS = [1, 2, 3, 4] as const;
export type CategoryLevel = (typeof CATEGORY_LEVELS)[number];
export const MAX_CATEGORY_LEVEL: CategoryLevel = 4;
export const PROVIDER_MESSAGE_MAX = 300;

export type Category = {
  code: string;
  level: CategoryLevel;
  // Leaf group: its parts are read with parts({ categoryCode: code, level }).
  last: boolean;
  name: string;
  remark: string;
  diagram: string | null;
  // The provider's own is_fit_for_this_vin flag; null when not reported. It is a hint, not a confirmation.
  providerFit: boolean | null;
};
export type CategoriesResult = ProviderResult<{ categories: Category[] }>;

export type CatalogPart = {
  oe: string;
  // Uppercase letters and digits only, for comparing OE numbers from catalog pages and OE search.
  normalizedOe: string;
  name: string;
  nameZh: string;
  engineerPartNumber: string;
  // The provider's option filters (model_optional / model_not_optional): which trims or options the
  // part is listed for or excluded from. The sourcer reads them when checking compatibility.
  modelOptional: string;
  modelNotOptional: string;
  callout: string;
  quantity: string;
  remark: string;
  replacement: string;
  beginDate: string;
  endDate: string;
  // EPC diagram of the group, not a photo of the product.
  diagram: string | null;
  image: string | null;
  providerFit: boolean | null;
  compatibility: "requires_review";
};
export type PartsResult = ProviderResult<{ parts: CatalogPart[] }>;

export type CategoriesInput = { vin: string; epc: string; level: CategoryLevel; parentCode?: string };
export type PartsInput = { vin: string; epc: string; categoryCode: string; level: CategoryLevel };

// No price method on purpose: 17VIN 4S prices are about two years old and the supplier advised against using them.
export interface PartsProvider {
  readonly name: string;
  readonly mode: ProviderMode;
  decodeVin(vin: string): Promise<DecodeResult>;
  categories(input: CategoriesInput): Promise<CategoriesResult>;
  parts(input: PartsInput): Promise<PartsResult>;
  searchOe(oe: string): Promise<PartsResult>;
}

export function decodeFailure(meta: ProviderMeta): DecodeResult {
  return { ...meta, candidates: [], ambiguous: false };
}

export function categoriesFailure(meta: ProviderMeta): CategoriesResult {
  return { ...meta, categories: [] };
}

export function partsFailure(meta: ProviderMeta): PartsResult {
  return { ...meta, parts: [] };
}
