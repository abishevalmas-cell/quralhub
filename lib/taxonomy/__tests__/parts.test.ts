import { describe, expect, it } from "vitest";
import {
  PART_GROUPS,
  PART_TYPES,
  getPartType,
  groupLabels,
  groupLabelsZh,
  matchParts,
  normalizeText,
  parseQuery,
  partTypesByGroup,
} from "@/lib/taxonomy";
import { STOPWORDS, isCyrillic, toWord, tokenize } from "@/lib/taxonomy/text";

describe("part types dictionary", () => {
  it("has at least 180 part types with unique kebab-case ids", () => {
    expect(PART_TYPES.length).toBeGreaterThanOrEqual(180);
    const ids = PART_TYPES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("fills every field", () => {
    for (const p of PART_TYPES) {
      expect(PART_GROUPS, p.id).toContain(p.group);
      expect(p.ru.trim(), p.id).not.toBe("");
      expect(p.en.trim(), p.id).not.toBe("");
      expect(p.zh, p.id).toMatch(/[一-鿿]/);
      expect(p.zh, `${p.id} zh must not carry a side`).not.toMatch(/^[左右]/);
      expect(p.synonyms.length, p.id).toBeGreaterThan(0);
      expect(p.epcHints.length, p.id).toBeGreaterThan(0);
      for (const s of p.synonyms) expect(normalizeText(s), `${p.id}: "${s}"`).not.toBe("");
    }
  });

  it("uses every group and labels it in Russian and Chinese", () => {
    for (const g of PART_GROUPS) {
      expect(partTypesByGroup(g).length, g).toBeGreaterThan(0);
      expect(groupLabels[g]).toMatch(/[А-Яа-яЁё]/);
      expect(groupLabelsZh[g]).toMatch(/[一-鿿]/);
    }
  });

  it("covers EV and PHEV parts", () => {
    for (const id of ["hv-battery", "obc", "dcdc", "charging-port", "electric-coolant-pump", "e-motor", "inverter", "range-extender"])
      expect(getPartType(id)?.group, id).toMatch(/hv|cooling/);
  });

  it("looks parts up by id", () => {
    expect(getPartType("headlight")?.zh).toBe("前大灯总成");
    expect(getPartType("no-such-part")).toBeNull();
    expect(getPartType(null)).toBeNull();
  });

  it("parts with axle-specific zh names never also ask for an axis", () => {
    for (const p of PART_TYPES) if (/^[前后]/.test(p.zh)) expect(p.needsAxis, p.id).toBe(false);
  });

  // Regression guard for the dictionary: adding a synonym must not steal another part's words.
  it("ranks each part first (or tied for first) for each of its own synonyms and its Russian name", () => {
    const stolen: string[] = [];
    for (const p of PART_TYPES) {
      for (const s of [...p.synonyms, p.ru]) {
        const { matches } = parseQuery(s);
        const mine = matches.find((m) => m.partType.id === p.id);
        if (!mine || mine.score < matches[0].score) stolen.push(`${p.id} <- "${s}" (${matches[0]?.partType.id ?? "none"})`);
      }
    }
    expect(stolen).toEqual([]);
  });

  it("ranks each part first for its own Chinese name", () => {
    const wrong = PART_TYPES.filter((p) => parseQuery(p.zh).matches[0]?.partType.id !== p.id).map((p) => p.id);
    expect(wrong).toEqual([]);
  });

  it("cannot be changed by a caller", () => {
    const part = PART_TYPES[0];
    expect(Object.isFrozen(PART_TYPES)).toBe(true);
    expect(Object.isFrozen(part)).toBe(true);
    expect(() => part.synonyms.push("x")).toThrow();
    expect(() => {
      (part as { ru: string }).ru = "x";
    }).toThrow();
  });

  // "контроллер автомобиля" lost "автомобиля" to the stopwords and then claimed every "контроллер …".
  it("never lets stopwords shorten a synonym to a single word", () => {
    const harmless = new Set(["комплект", "assy", "assembly", "в", "на", "для", "с", "со", "под", "и", "or", "of", "for"]);
    const collapsed: string[] = [];
    for (const p of PART_TYPES) {
      for (const s of [...p.synonyms, ...p.epcHints]) {
        const all = tokenize(normalizeText(s));
        const kept = all.filter((t) => !STOPWORDS.has(t));
        if (all.length > 1 && kept.length === 1 && all.some((t) => STOPWORDS.has(t) && !harmless.has(t)))
          collapsed.push(`${p.id}: "${s}"`);
      }
    }
    expect(collapsed).toEqual([]);
  });

  // Vowel folding (калодки → колодки) must not merge words of different parts.
  it("keeps distinct dictionary words apart after vowel folding", () => {
    const owner = new Map<string, { stem: string; id: string }>();
    const clashes: string[] = [];
    for (const p of PART_TYPES) {
      for (const s of [...p.synonyms, p.ru]) {
        for (const t of tokenize(normalizeText(s)).filter((x) => !STOPWORDS.has(x))) {
          const w = toWord(t);
          if (w.stem.length < 4 || !isCyrillic(w.stem)) continue;
          const seen = owner.get(w.folded);
          if (seen && seen.stem !== w.stem && seen.id !== p.id) clashes.push(`${seen.stem} (${seen.id}) ~ ${w.stem} (${p.id})`);
          if (!seen) owner.set(w.folded, { stem: w.stem, id: p.id });
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it("matches raw text without prior normalization", () => {
    expect(matchParts("ФАРА!!")[0].partType.id).toBe("headlight");
    expect(matchParts("Стеклоподъёмник")[0].partType.id).toBe("window-regulator");
    expect(matchParts("")).toEqual([]);
  });
});
