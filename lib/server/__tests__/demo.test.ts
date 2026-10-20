import { describe, expect, it } from "vitest";
import { authSecret, isDemoPreview } from "../demo";

describe("demo preview", () => {
  it("applies only to Vercel previews on the embedded database", () => {
    expect(isDemoPreview({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isDemoPreview({ VERCEL_ENV: "preview", DATABASE_URL: "postgres://x" })).toBe(false);
    expect(isDemoPreview({ VERCEL_ENV: "production" })).toBe(false);
    expect(isDemoPreview({})).toBe(false);
  });

  it("uses AUTH_SECRET when set and a stable random secret in a demo preview", () => {
    expect(authSecret({ AUTH_SECRET: "s1" })).toBe("s1");
    const a = authSecret({ VERCEL_ENV: "preview", NODE_ENV: "production" });
    expect(a).toHaveLength(43);
    expect(authSecret({ VERCEL_ENV: "preview", NODE_ENV: "production" })).toBe(a);
  });

  it("still requires AUTH_SECRET in production with a real database", () => {
    expect(() => authSecret({ NODE_ENV: "production" })).toThrow("AUTH_SECRET is required");
    expect(() => authSecret({ NODE_ENV: "production", VERCEL_ENV: "preview", DATABASE_URL: "postgres://x" })).toThrow();
    expect(authSecret({ NODE_ENV: "development" })).toBe("tetix-dev-secret");
  });
});
