import { describe, expect, it } from "vitest";
import { testDb } from "@/tests/helpers/db";
import { normalizePhone } from "../phone";
import { otpCodes } from "@/lib/db/schema";
import { OTP_LIMIT_MESSAGE, requestOtp, verifyOtp } from "../otp";
import { actorFromToken, createSession, deleteSession } from "../session";

describe("phone", () => {
  it("normalizes CIS numbers", () => {
    expect(normalizePhone("+7 701 123 45 67")).toBe("77011234567");
    expect(normalizePhone("8 (701) 123-45-67")).toBe("77011234567");
    expect(normalizePhone("+998 90 123 45 67")).toBe("998901234567");
    expect(normalizePhone("+996 555 123 456")).toBe("996555123456");
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("otp + sessions", () => {
  it("logs in with a valid code once", async () => {
    const db = await testDb();
    const { code, phone } = await requestOtp(db, "+77011112233");
    await expect(verifyOtp(db, phone, "000000" === code ? "111111" : "000000")).rejects.toThrow("Неверный код");
    const user = await verifyOtp(db, phone, code);
    expect(user.phone).toBe("77011112233");
    expect(user.role).toBe("customer");
    await expect(verifyOtp(db, phone, code)).rejects.toThrow();
    const { token } = await createSession(db, user.id);
    expect((await actorFromToken(db, token))?.id).toBe(user.id);
    await deleteSession(db, token);
    expect(await actorFromToken(db, token)).toBeNull();
  });

  it("rate limits code requests", async () => {
    const db = await testDb();
    for (let i = 0; i < 3; i++) await requestOtp(db, "+77015556677");
    await expect(requestOtp(db, "+77015556677")).rejects.toThrow("Слишком много кодов");
  });

  it("locks after too many wrong attempts", async () => {
    const db = await testDb();
    const { code, phone } = await requestOtp(db, "+77019998877");
    const wrong = code === "123456" ? "654321" : "123456";
    for (let i = 0; i < 5; i++) await expect(verifyOtp(db, phone, wrong)).rejects.toThrow("Неверный код");
    await expect(verifyOtp(db, phone, code)).rejects.toThrow("Слишком много попыток");
  });

  it("counts parallel wrong guesses atomically: at most 5 codes are ever checked", async () => {
    const db = await testDb();
    const { code, phone } = await requestOtp(db, "+77019998866");
    const wrong = code === "123456" ? "654321" : "123456";
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => verifyOtp(db, phone, wrong)));
    const messages = results.map((r) => (r.status === "rejected" ? (r.reason as Error).message : "ok"));
    expect(messages.filter((m) => m === "Неверный код").length).toBeLessThanOrEqual(5);
    expect(messages.filter((m) => m.startsWith("Слишком много попыток")).length).toBeGreaterThanOrEqual(15);
    expect(messages).not.toContain("ok");
    // The right code is refused too once the attempts are used up.
    await expect(verifyOtp(db, phone, code)).rejects.toThrow("Слишком много попыток");
  });

  it("issues at most 3 codes to a burst of parallel requests", async () => {
    const db = await testDb();
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => requestOtp(db, "+77015556600")));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(await db.select().from(otpCodes)).toHaveLength(3);
  });

  it("caps the codes sent to all numbers in a day", async () => {
    const db = await testDb();
    const env = { OTP_DAILY_LIMIT: "2" };
    await requestOtp(db, "+77015550001", new Date(), env);
    await requestOtp(db, "+77015550002", new Date(), env);
    await expect(requestOtp(db, "+77015550003", new Date(), env)).rejects.toMatchObject({ status: 429, message: OTP_LIMIT_MESSAGE });
    // A day later the cap starts over, and codes older than two days are cleaned up.
    const later = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    await requestOtp(db, "+77015550003", later, env);
    expect((await db.select().from(otpCodes)).map((r) => r.phone)).toEqual(["77015550003"]);
  });

  it("grants admin to ADMIN_PHONES", async () => {
    process.env.ADMIN_PHONES = "+7 701 000 00 01";
    const db = await testDb();
    const { code, phone } = await requestOtp(db, "87010000001");
    expect((await verifyOtp(db, phone, code)).role).toBe("admin");
    delete process.env.ADMIN_PHONES;
  });
});

describe("maskPhone", () => {
  it("keeps only the country code and the last 4 digits", async () => {
    const { maskPhone } = await import("../phone");
    expect(maskPhone("77011234567")).toBe("+7••••••4567");
    expect(maskPhone("998901234567")).toBe("+998•••••4567");
  });
});
