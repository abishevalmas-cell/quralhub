import { afterEach, describe, expect, it, vi } from "vitest";
import { linkTokenFromStart, telegramLinkToken, telegramLinkUrl, verifyTelegramLinkToken } from "@/lib/notify/link";

const USER = "3f2b8c1e-9a4d-4b7e-8f10-2c3d4e5f6a7b";
const OTHER = "00000000-0000-4000-8000-000000000001";
const ISSUED = new Date("2026-10-20T10:00:00Z");
const after = (minutes: number) => new Date(ISSUED.getTime() + minutes * 60000);

const previousSecret = process.env.AUTH_SECRET;
afterEach(() => {
  if (previousSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = previousSecret;
});

const flip = (token: string, index: number) =>
  token.slice(0, index) + (token[index] === "A" ? "B" : "A") + token.slice(index + 1);

describe("telegram link token", () => {
  it("round-trips the user id and fits a Telegram start parameter", () => {
    const token = telegramLinkToken(USER, ISSUED);
    expect(token).toMatch(/^[A-Za-z0-9_-]{49}$/);
    expect(verifyTelegramLinkToken(token, ISSUED)).toBe(USER);
    expect(verifyTelegramLinkToken(telegramLinkToken(USER.toUpperCase(), ISSUED), ISSUED)).toBe(USER);
  });

  it("is valid for 30 minutes", () => {
    const token = telegramLinkToken(USER, ISSUED);
    expect(verifyTelegramLinkToken(token, after(29))).toBe(USER);
    expect(verifyTelegramLinkToken(token, after(30))).toBe(USER);
    expect(verifyTelegramLinkToken(token, after(30.02))).toBeNull();
    expect(verifyTelegramLinkToken(token, after(60 * 24))).toBeNull();
  });

  it("rounds issue time down, so a token never lives longer than 30 minutes", () => {
    const token = telegramLinkToken(USER, after(0.9));
    expect(verifyTelegramLinkToken(token, after(30.5))).toBeNull();
  });

  it("tolerates one minute of clock skew but not tokens from the future", () => {
    expect(verifyTelegramLinkToken(telegramLinkToken(USER, after(1)), ISSUED)).toBe(USER);
    expect(verifyTelegramLinkToken(telegramLinkToken(USER, after(5)), ISSUED)).toBeNull();
  });

  it("rejects tampered tokens", () => {
    const token = telegramLinkToken(USER, ISSUED);
    for (const index of [0, 10, 26, 27, 40, 48]) expect(verifyTelegramLinkToken(flip(token, index), ISSUED)).toBeNull();
    const forged = telegramLinkToken(OTHER, ISSUED).slice(0, 27) + token.slice(27);
    expect(verifyTelegramLinkToken(forged, ISSUED)).toBeNull();
  });

  it("rejects tokens signed with another secret", () => {
    process.env.AUTH_SECRET = "first-secret-for-tests";
    const token = telegramLinkToken(USER, ISSUED);
    process.env.AUTH_SECRET = "second-secret-for-tests";
    expect(verifyTelegramLinkToken(token, ISSUED)).toBeNull();
  });

  it("rejects garbage", () => {
    for (const value of ["", "abc", "x".repeat(49), "x".repeat(200), `${USER}.123.sig`, null, undefined, 42]) {
      expect(verifyTelegramLinkToken(value as unknown as string, ISSUED)).toBeNull();
    }
  });

  it("refuses to sign something that is not a user id or a valid date", () => {
    expect(() => telegramLinkToken("../admin")).toThrow();
    expect(() => telegramLinkToken(USER, new Date(Number.NaN))).toThrow();
  });

  it("rejects every token when the clock is broken", () => {
    expect(verifyTelegramLinkToken(telegramLinkToken(USER, ISSUED), new Date(Number.NaN))).toBeNull();
  });

  it("rejects other base64url spellings of the same bytes", () => {
    const token = telegramLinkToken(USER, ISSUED);
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    // The last character of each part carries unused low bits; changing only those keeps the decoded bytes.
    const respell = (index: number, unusedBits: number) => {
      const value = alphabet.indexOf(token[index]);
      const other = alphabet[value ^ ((1 << unusedBits) - 1)];
      return token.slice(0, index) + other + token.slice(index + 1);
    };
    const decoded = (t: string) => [t.slice(0, 27), t.slice(27)].map((part) => Buffer.from(part, "base64url").toString("hex"));
    for (const variant of [respell(26, 2), respell(48, 4)]) {
      expect(variant).not.toBe(token);
      expect(decoded(variant)).toEqual(decoded(token));
      expect(verifyTelegramLinkToken(variant, ISSUED)).toBeNull();
    }
  });

  it("uses the development secret only outside production", () => {
    delete process.env.AUTH_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    try {
      expect(() => telegramLinkToken(USER, ISSUED)).toThrow("AUTH_SECRET");
      process.env.AUTH_SECRET = "production-secret-for-tests";
      expect(verifyTelegramLinkToken(telegramLinkToken(USER, ISSUED), ISSUED)).toBe(USER);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("telegram deep link", () => {
  it("builds a t.me link when the bot username is set", () => {
    const url = telegramLinkUrl(USER, ISSUED, "@TetixBot");
    expect(url).toBe(`https://t.me/TetixBot?start=${telegramLinkToken(USER, ISSUED)}`);
    expect(telegramLinkUrl(USER, ISSUED, "")).toBeNull();
    expect(telegramLinkUrl(USER, ISSUED, "bad/name")).toBeNull();
  });

  it("extracts the token from /start", () => {
    const token = telegramLinkToken(USER, ISSUED);
    expect(linkTokenFromStart(`/start ${token}`)).toBe(token);
    expect(linkTokenFromStart(`/start@TetixBot ${token}`)).toBe(token);
    expect(linkTokenFromStart("/start")).toBeNull();
    expect(linkTokenFromStart("hello")).toBeNull();
    expect(linkTokenFromStart(`/start ${token} extra`)).toBeNull();
  });
});
