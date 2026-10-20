import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "../errors";
import { describeError, readJson, route } from "../http";
import { assertRate, clientIp, hitRate, RATE_RULES, resetRateLimits } from "../rate-limit";

const URL_BASE = "http://localhost/api/test";

// A chunked body: no Content-Length, `chunks` pieces of `size` bytes each. Counts how much the reader pulled.
function chunkedRequest(chunks: number, size: number) {
  let pulled = 0;
  const piece = new TextEncoder().encode("x".repeat(size));
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled >= chunks) return controller.close();
      pulled++;
      controller.enqueue(piece);
    },
  });
  const request = new Request(URL_BASE, { method: "POST", body, duplex: "half" } as RequestInit & { duplex: "half" });
  return { request, pulled: () => pulled };
}

describe("readJson", () => {
  const Schema = z.object({ phone: z.string() });

  it("parses a normal body", async () => {
    const request = new Request(URL_BASE, { method: "POST", body: JSON.stringify({ phone: "+7 701" }) });
    expect(await readJson(request, Schema)).toEqual({ phone: "+7 701" });
  });

  it("refuses a declared length over the cap without reading the body", async () => {
    const request = new Request(URL_BASE, {
      method: "POST",
      headers: { "content-length": String(10 * 1024 * 1024) },
      body: "{}",
    });
    await expect(readJson(request, Schema)).rejects.toMatchObject({ status: 413 });
  });

  it("stops reading a chunked body as soon as it passes 256 KB", async () => {
    const { request, pulled } = chunkedRequest(4000, 64 * 1024); // 250 MB if read whole
    const error = await readJson(request, Schema).catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(413);
    expect(pulled()).toBeLessThan(10);
  });

  it("counts bytes, not characters", async () => {
    // 100k Cyrillic letters are 200 KB of UTF-8: under the cap. 140k are 280 KB: over it.
    const ok = new Request(URL_BASE, { method: "POST", body: JSON.stringify({ phone: "ж".repeat(100_000) }) });
    expect((await readJson(ok, Schema)).phone).toHaveLength(100_000);
    const { request } = chunkedRequest(1, 0);
    expect(await readJson(request, z.object({}))).toEqual({});
    const big = new Request(URL_BASE, { method: "POST", body: JSON.stringify({ phone: "ж".repeat(140_000) }) });
    await expect(readJson(big, Schema)).rejects.toMatchObject({ status: 413 });
  });
});

describe("route error logging", () => {
  afterEach(() => vi.restoreAllMocks());

  it("never logs the message of a failed query, which carries the bound values", async () => {
    const cause = Object.assign(new Error('invalid byte sequence for encoding "UTF8": 0x00'), { code: "22021", name: "PostgresError" });
    class DrizzleQueryError extends Error {
      constructor() {
        super('Failed query: update "users" set "name" = $1, "phone" = $2\nparams: Иван,77010000002,LGXCE4CB0PA000001');
        this.name = "DrizzleQueryError";
        this.cause = cause;
      }
    }
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = route(async () => {
      throw new DrizzleQueryError();
    });
    const response = await handler(new Request(URL_BASE, { method: "GET" }), {});
    expect(response.status).toBe(500);
    const line = logged.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(line).toContain("DrizzleQueryError");
    expect(line).toContain("22021");
    for (const secret of ["77010000002", "Иван", "LGXCE4CB0PA000001", "Failed query"]) expect(line).not.toContain(secret);
    expect(describeError("boom")).toBe("unknown error");
    // Other errors keep a short message, with VINs and phone numbers masked.
    expect(describeError(new Error("AUTH_SECRET is required in production"))).toBe("Error: AUTH_SECRET is required in production");
    const masked = describeError(new TypeError("no car LGXCE4CB0PA000001 for 77010000002"));
    expect(masked).toBe("TypeError: no car LGX…0001 for •••0002");
    const pg = Object.assign(new Error('invalid input syntax for type uuid: "77010000002"'), { code: "22P02" });
    expect(describeError(pg)).toBe("Error (code 22P02)");
  });
});

describe("rate limits", () => {
  afterEach(() => resetRateLimits());

  it("uses the last X-Forwarded-For entry, which the client cannot forge", () => {
    const request = new Request(URL_BASE, { headers: { "x-forwarded-for": "1.1.1.1, 203.0.113.7" } });
    expect(clientIp(request)).toBe("203.0.113.7");
    expect(clientIp(new Request(URL_BASE, { headers: { "x-real-ip": "198.51.100.2" } }))).toBe("198.51.100.2");
    expect(clientIp(new Request(URL_BASE))).toBe("local");
  });

  it("refuses a client over the limit and starts over in the next window", () => {
    const rule = { name: "t", limit: 3, windowMs: 1000 };
    const t0 = 1_000_000;
    expect([1, 2, 3, 4].map(() => hitRate(rule, "a", t0))).toEqual([true, true, true, false]);
    expect(hitRate(rule, "b", t0)).toBe(true);
    expect(hitRate(rule, "a", t0 + 1001)).toBe(true);
  });

  it("answers 429 with the same message for every client", () => {
    const request = new Request(URL_BASE, { headers: { "x-forwarded-for": "203.0.113.9" } });
    for (let i = 0; i < RATE_RULES.otpShort.limit; i++) assertRate(request, [RATE_RULES.otpShort, RATE_RULES.otpDay]);
    expect(() => assertRate(request, [RATE_RULES.otpShort, RATE_RULES.otpDay])).toThrow(
      expect.objectContaining({ status: 429 }) as unknown as Error,
    );
  });
});
