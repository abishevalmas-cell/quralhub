import { describe, expect, it } from "vitest";
import { authSecret, isDemoDeployment } from "../demo";

describe("demo deployment", () => {
  it("applies only to Vercel deployments on the embedded database", () => {
    expect(isDemoDeployment({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe(true);
    expect(isDemoDeployment({ VERCEL: "1", VERCEL_ENV: "production" })).toBe(true);
    expect(isDemoDeployment({ VERCEL: "1", DATABASE_URL: "postgres://x" })).toBe(false);
    expect(isDemoDeployment({ NODE_ENV: "production" })).toBe(false);
    expect(isDemoDeployment({})).toBe(false);
  });

  it("uses AUTH_SECRET when set and a stable random secret in a demo deployment", () => {
    expect(authSecret({ AUTH_SECRET: "s1" })).toBe("s1");
    const a = authSecret({ VERCEL: "1", NODE_ENV: "production" });
    expect(a).toHaveLength(43);
    expect(authSecret({ VERCEL: "1", NODE_ENV: "production" })).toBe(a);
  });

  it("still requires AUTH_SECRET in production with a real database", () => {
    expect(() => authSecret({ NODE_ENV: "production" })).toThrow("AUTH_SECRET is required");
    expect(() => authSecret({ NODE_ENV: "production", VERCEL: "1", DATABASE_URL: "postgres://x" })).toThrow();
    expect(authSecret({ NODE_ENV: "development" })).toBe("tetix-dev-secret");
  });
});
