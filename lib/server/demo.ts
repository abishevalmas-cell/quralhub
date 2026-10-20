import { randomBytes } from "node:crypto";

// Demo deployment: any Vercel deployment running on the embedded PGlite database (no DATABASE_URL).
// Its data lives in the instance's /tmp and disappears with it, so it cannot be a real service:
// login codes are shown on screen and a demo administrator exists. With a real database none of this applies.
export const DEMO_ADMIN_PHONE = "77010000001";

export function isDemoDeployment(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.VERCEL) && !env.DATABASE_URL;
}

let demoSecret: string | undefined;

// Shared by OTP hashing and Telegram link signatures. A demo deployment without AUTH_SECRET gets a random
// per-instance secret, which matches the lifetime of its per-instance database.
export function authSecret(env: Record<string, string | undefined> = process.env): string {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (isDemoDeployment(env)) return (demoSecret ??= randomBytes(32).toString("base64url"));
  if (env.NODE_ENV === "production") throw new Error("AUTH_SECRET is required in production");
  return "tetix-dev-secret";
}
