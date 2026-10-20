import { tooMany } from "./errors";

// Fixed-window counters in this server's memory, for the endpoints anyone can call without an account (login codes).
// They only slow a single client down; the limits that must hold across servers live in the database (lib/auth/otp.ts).
// Limits are generous because many mobile users in Kazakhstan share one carrier IP address.

export type RateRule = { name: string; limit: number; windowMs: number };

export const RATE_RULES = {
  otpShort: { name: "otp-10m", limit: 20, windowMs: 10 * 60 * 1000 },
  otpDay: { name: "otp-day", limit: 100, windowMs: 24 * 3600 * 1000 },
  verifyShort: { name: "verify-10m", limit: 60, windowMs: 10 * 60 * 1000 },
} satisfies Record<string, RateRule>;

export const RATE_MESSAGE = "Слишком много запросов. Попробуйте позже";

const MAX_KEYS = 50_000;
const windows = new Map<string, { count: number; resetAt: number }>();

function prune(now: number) {
  for (const [key, entry] of windows) if (entry.resetAt <= now) windows.delete(key);
  // Still full after dropping expired windows: start over rather than grow without bound.
  if (windows.size >= MAX_KEYS) windows.clear();
}

// Counts one hit; false when the client is over the limit for this window.
export function hitRate(rule: RateRule, key: string, now = Date.now()): boolean {
  const id = `${rule.name}:${key}`;
  let entry = windows.get(id);
  if (!entry || entry.resetAt <= now) {
    if (!entry && windows.size >= MAX_KEYS) prune(now);
    entry = { count: 0, resetAt: now + rule.windowMs };
    windows.set(id, entry);
  }
  entry.count++;
  return entry.count <= rule.limit;
}

// The proxy in front of the app appends the address it saw, so the last X-Forwarded-For entry is the one a client
// cannot forge; earlier entries are whatever the client sent.
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").map((part) => part.trim()).filter(Boolean).pop();
  return (last || request.headers.get("x-real-ip")?.trim() || "local").slice(0, 64);
}

// Every rule counts the hit even when an earlier one already refused it, so a client that keeps trying stays blocked.
export function assertRate(request: Request, rules: RateRule[], now = Date.now()) {
  const ip = clientIp(request);
  let allowed = true;
  for (const rule of rules) if (!hitRate(rule, ip, now)) allowed = false;
  if (!allowed) throw tooMany(RATE_MESSAGE);
}

export function resetRateLimits() {
  windows.clear();
}
