import { describe, expect, it } from "vitest";
import { PART_TYPES, getPartType, parseQuery, zhLabel, type PartType } from "@/lib/taxonomy";

const part = (id: string): PartType => {
  const p = getPartType(id);
  if (!p) throw new Error(`unknown part ${id}`);
  return p;
};

describe("zhLabel", () => {
  it.each([
    ["headlight", "front", "left", "左前大灯总成"],
    ["headlight", null, "right", "右前大灯总成"],
    ["air-spring", "front", "right", "右前空气弹簧"],
    ["brake-pads", "rear", null, "后刹车片"],
    ["brake-pads", "front", null, "前刹车片"],
    ["door", "rear", "left", "左后车门"],
    ["door-handle", "front", "right", "右前车门外把手"],
    ["mirror", null, "right", "右外后视镜总成"],
    ["fender", null, "left", "左前翼子板"],
    ["rear-quarter-panel", "rear", "right", "右后翼子板"],
    ["windshield", "front", null, "前挡风玻璃"],
    ["tailgate", "rear", null, "后背门"],
    ["bumper", "rear", null, "后保险杠"],
    ["bumper-bracket", "front", "left", "左前保险杠支架"],
    ["corner-radar", "rear", "left", "左后角雷达"],
    ["wiper-blade", "front", null, "雨刮片"],
    ["tail-light", "rear", "left", "左尾灯总成"],
    ["shock-absorber", null, null, "减震器"],
    ["tailgate-handle", "rear", null, "后背门把手"],
    ["mirror", "rear", "left", "左外后视镜总成"],
  ] as const)("%s %s %s → %s", (id, axis, side, label) => {
    expect(zhLabel(part(id), axis, side)).toBe(label);
  });

  it("never duplicates the axis", () => {
    expect(zhLabel(part("rear-wiper-blade"), "rear", null)).toBe("后雨刮片");
    expect(zhLabel(part("front-radar"), "front", null)).toBe("前毫米波雷达");
  });

  it("builds a label straight from a parsed query", () => {
    const q = parseQuery("передняя левая фара");
    expect(zhLabel(q.matches[0].partType, q.axis, q.side)).toBe("左前大灯总成");
    const air = parseQuery("пневмобаллон передний правый");
    expect(zhLabel(air.matches[0].partType, air.axis, air.side)).toBe("右前空气弹簧");
    const pads = parseQuery("колодки задние");
    expect(zhLabel(pads.matches[0].partType, pads.axis, pads.side)).toBe("后刹车片");
  });

  it("never repeats or contradicts a prefix for any part", () => {
    for (const p of PART_TYPES) {
      for (const axis of [null, "front", "rear"] as const) {
        for (const side of [null, "left", "right"] as const) {
          const label = zhLabel(p, axis, side);
          expect(label.endsWith(p.zh), `${p.id}: ${label}`).toBe(true);
          expect(label, p.id).not.toMatch(/^(左|右)?(前前|后后|前后|后前)/);
          expect(label.startsWith("左") || label.startsWith("右"), p.id).toBe(side !== null);
        }
      }
    }
  });

  it("parses the parts that the Chinese labels name", () => {
    for (const id of ["headlight", "air-spring", "door", "bumper-bracket", "abs-sensor"]) {
      const p = part(id);
      const parsed = parseQuery(zhLabel(p, p.needsAxis ? "front" : null, p.needsSide ? "left" : null));
      expect(parsed.matches[0].partType.id, id).toBe(id);
      expect(parsed.side, id).toBe(p.needsSide ? "left" : null);
    }
  });
});
