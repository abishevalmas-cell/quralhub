import { FixtureProvider } from "./fixture";
import { SeventeenVinProvider, type FetchLike } from "./seventeen-vin";
import type { PartsProvider } from "./types";

export * from "./types";
export { FixtureProvider, FIXTURE_NOTICE, FIXTURE_VINS } from "./fixture";
export { SeventeenVinProvider, VIN_DIRECT_METHODS, type FetchLike, type VinDirectMethod } from "./seventeen-vin";
export {
  createGateway,
  dailyLimitFromEnv,
  type GatewayOptions,
  type ProviderGateway,
  type ProviderUsage,
} from "./gateway";
export { maskVin, normalizeOe } from "./validate";

// Live 17VIN only when both server-side credentials are set; otherwise synthetic fixtures, clearly marked as such.
// Both values are trimmed: a trailing newline from a pasted secret would otherwise fail every signature (code 1004).
export function getProvider(env: Record<string, string | undefined> = process.env, fetcher?: FetchLike): PartsProvider {
  const user = env.TETIX_17VIN_USER?.trim();
  const password = env.TETIX_17VIN_PASSWORD?.trim();
  if (user && password) return new SeventeenVinProvider({ user, password, ...(fetcher ? { fetch: fetcher } : {}) });
  return new FixtureProvider();
}
