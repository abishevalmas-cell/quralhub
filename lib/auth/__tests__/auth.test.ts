import { describe, expect, it } from "vitest";
import { testDb } from "@/tests/helpers/db";
import { normalizePhone } from "../phone";
import { requestOtp, verifyOtp } from "../otp";
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

  it("grants admin to ADMIN_PHONES", async () => {
    process.env.ADMIN_PHONES = "+7 701 000 00 01";
    const db = await testDb();
    const { code, phone } = await requestOtp(db, "87010000001");
    expect((await verifyOtp(db, phone, code)).role).toBe("admin");
    delete process.env.ADMIN_PHONES;
  });
});
