import { describe, expect, it } from "vitest";
import { LEAD_TIME_MESSAGES, LeadTimeSchema, formatLeadTime, pluralDays, validateLeadTime } from "@/lib/pricing";

describe("pluralDays", () => {
  it("picks the Russian plural form", () => {
    const cases: [number, string][] = [
      [0, "дней"],
      [1, "день"],
      [2, "дня"],
      [4, "дня"],
      [5, "дней"],
      [11, "дней"],
      [12, "дней"],
      [14, "дней"],
      [21, "день"],
      [22, "дня"],
      [25, "дней"],
      [101, "день"],
      [111, "дней"],
      [112, "дней"],
      [122, "дня"],
    ];
    for (const [n, word] of cases) expect(pluralDays(n), String(n)).toBe(word);
  });
});

describe("formatLeadTime", () => {
  it("formats ranges with an en dash and agrees with the last number", () => {
    expect(formatLeadTime(12, 18)).toBe("12–18 дней");
    expect(formatLeadTime(2, 4)).toBe("2–4 дня");
    expect(formatLeadTime(5, 21)).toBe("5–21 день");
    expect(formatLeadTime(1, 2)).toBe("1–2 дня");
  });

  it("agrees with large numbers", () => {
    expect(formatLeadTime(100, 121)).toBe("100–121 день");
    expect(formatLeadTime(100, 111)).toBe("100–111 дней");
    expect(formatLeadTime(30, 42)).toBe("30–42 дня");
  });

  it("shows a single number when both ends match", () => {
    expect(formatLeadTime(1, 1)).toBe("1 день");
    expect(formatLeadTime(3, 3)).toBe("3 дня");
    expect(formatLeadTime(14, 14)).toBe("14 дней");
  });

  it("is lenient for display", () => {
    expect(formatLeadTime(18, 12)).toBe("12–18 дней");
    expect(formatLeadTime(null, 10)).toBe("—");
    expect(formatLeadTime(5, undefined)).toBe("—");
    expect(formatLeadTime(1.5, 3)).toBe("—");
    expect(formatLeadTime(-1, 3)).toBe("—");
    expect(formatLeadTime(Number.NaN, 3)).toBe("—");
  });
});

describe("validateLeadTime", () => {
  it("accepts a sane range", () => {
    expect(validateLeadTime(12, 18)).toBeNull();
    expect(validateLeadTime(1, 1)).toBeNull();
    expect(validateLeadTime(1, 180)).toBeNull();
  });

  it("rejects out-of-range and non-integer days", () => {
    expect(validateLeadTime(0, 5)).toBe(LEAD_TIME_MESSAGES.range);
    expect(validateLeadTime(5, 181)).toBe(LEAD_TIME_MESSAGES.range);
    expect(validateLeadTime(1.5, 5)).toBe(LEAD_TIME_MESSAGES.range);
    expect(validateLeadTime("5", 7)).toBe(LEAD_TIME_MESSAGES.range);
    expect(validateLeadTime(undefined, 7)).toBe(LEAD_TIME_MESSAGES.range);
  });

  it("rejects a reversed range", () => {
    expect(validateLeadTime(18, 12)).toBe(LEAD_TIME_MESSAGES.order);
  });

  it("works as a zod schema for request bodies", () => {
    expect(LeadTimeSchema.parse({ leadDaysMin: 12, leadDaysMax: 18 })).toEqual({ leadDaysMin: 12, leadDaysMax: 18 });
    const failed = LeadTimeSchema.safeParse({ leadDaysMin: 18, leadDaysMax: 12 });
    expect(failed.success).toBe(false);
    if (!failed.success) expect(failed.error.issues[0].message).toBe(LEAD_TIME_MESSAGES.order);
  });

  it("points the schema issue at the field to fix", () => {
    const issue = (value: unknown) => {
      const result = LeadTimeSchema.safeParse(value);
      return result.success ? null : { path: result.error.issues[0].path, message: result.error.issues[0].message };
    };
    expect(issue({ leadDaysMin: 5, leadDaysMax: 999 })).toEqual({ path: ["leadDaysMax"], message: LEAD_TIME_MESSAGES.range });
    expect(issue({ leadDaysMin: 0, leadDaysMax: 5 })).toEqual({ path: ["leadDaysMin"], message: LEAD_TIME_MESSAGES.range });
    expect(issue({ leadDaysMin: 5 })).toEqual({ path: ["leadDaysMax"], message: LEAD_TIME_MESSAGES.range });
    expect(issue({ leadDaysMin: 18, leadDaysMax: 12 })).toEqual({ path: ["leadDaysMin"], message: LEAD_TIME_MESSAGES.order });
    // A body that is not an object still gets a Russian message, not zod's English one.
    expect(issue(null)).toEqual({ path: [], message: LEAD_TIME_MESSAGES.range });
  });

  it("states the Russian messages plainly", () => {
    expect(LEAD_TIME_MESSAGES.range).toBe("Срок поставки — целое число дней от 1 до 180");
    expect(LEAD_TIME_MESSAGES.order).toBe("Минимальный срок не может быть больше максимального");
  });
});
