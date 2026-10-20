import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { zonePosition } from "../zones";
import { describe, expect, it } from "vitest";
import { CarIllustration } from "../car-illustration";
import { CarThumb } from "../car-thumb";
import { CAR_COLORS } from "../colors";
import { BODY_TYPES, hasChargePort, hasExhaust, zoneLabelsFor } from "../types";
import { VehicleStage } from "../vehicle-stage";

const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const refs = (html: string) => [...html.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);

describe("CarIllustration", () => {
  it.each(BODY_TYPES)("draws %s in every paint as a labelled image with clean geometry", (body) => {
    for (const c of CAR_COLORS) {
      const html = renderToStaticMarkup(h(CarIllustration, { body, color: c.hex, title: `Машина ${c.label}` }));
      expect(html).toMatch(/^<svg[^>]*viewBox="0 0 800 320"[^>]*role="img"/);
      expect(html).toContain(`<title id=`);
      expect(html).toContain(`Машина ${c.label}</title>`);
      expect(html).not.toMatch(/NaN|undefined|Infinity/);
      // Every gradient and clip path the drawing uses is defined in it.
      const defined = new Set(ids(html));
      for (const r of refs(html)) expect(defined.has(r), r).toBe(true);
    }
  });

  it("gives every car on a page its own gradient ids", () => {
    const html = renderToStaticMarkup(
      h("div", null, h(CarIllustration, { body: "sedan", color: "#fff" }), h(CarIllustration, { body: "sedan", color: "#fff" })),
    );
    const all = ids(html);
    expect(all.length).toBeGreaterThan(10);
    expect(new Set(all).size).toBe(all.length);
  });

  it("survives an unreadable color", () => {
    const html = renderToStaticMarkup(h(CarIllustration, { body: "suv", color: "not a color" }));
    expect(html).not.toMatch(/NaN|undefined/);
    expect(html).toContain("Большой SUV</title>");
  });

  it("can be decorative when the text around it names the car", () => {
    const html = renderToStaticMarkup(h(CarThumb, { body: "hatchback", color: "#7fa6a2" }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("<title");
    expect(html).not.toContain('role="img"');
    expect(html).toContain('viewBox="30 28 740 282"');
  });

  it("draws an exhaust only for a car with an engine", () => {
    const tip = 'width="20" height="6" rx="3"';
    expect(renderToStaticMarkup(h(CarIllustration, { body: "crossover", color: "#fff", powertrain: "ice" }))).toContain(tip);
    expect(renderToStaticMarkup(h(CarIllustration, { body: "crossover", color: "#fff", powertrain: "bev" }))).not.toContain(tip);
    expect(hasExhaust("bev")).toBe(false);
    expect(hasExhaust("phev")).toBe(true);
    expect(hasExhaust(null)).toBe(false);
    expect(renderToStaticMarkup(h(CarIllustration, { body: "crossover", color: "#fff" }))).not.toContain(tip);
  });
});

describe("zone labels", () => {
  it("call the flap a charge port only on plug-in cars", () => {
    expect(hasChargePort("bev")).toBe(true);
    expect(hasChargePort("erev")).toBe(true);
    expect(hasChargePort("phev")).toBe(true);
    expect(hasChargePort("hev")).toBe(false);
    expect(hasChargePort("ice")).toBe(false);
    expect(hasChargePort(null)).toBe(false);
    expect(zoneLabelsFor("bev").charge).toBe("Зарядный порт");
    expect(zoneLabelsFor("hev").charge).toBe("Лючок бензобака");
    expect(zoneLabelsFor("bev").underbody).toBe("Днище и батарея");
    expect(zoneLabelsFor("ice").underbody).toBe("Днище и выхлоп");
    expect(zoneLabelsFor(null).charge).toBe("Лючок бака или зарядки");
    expect(zoneLabelsFor(undefined).underbody).toBe("Днище");
  });
});

describe("VehicleStage", () => {
  const base = { title: "Zeekr X", subtitle: "2023 · YOU", body: "crossover" as const, color: "#7fa6a2" };

  it("renders hotspots as labelled toggle buttons when a handler is given", () => {
    const html = renderToStaticMarkup(
      h(VehicleStage, { ...base, zones: ["front", "mirror", "wheel-rear"], activeZone: "mirror", onZoneSelect: () => {} }),
    );
    expect(html.match(/<button/g)?.length).toBe(3);
    expect(html).toContain('aria-label="Передний бампер и фары" aria-pressed="false"');
    expect(html).toContain('aria-label="Зеркала и камеры" aria-pressed="true"');
    expect(html).toContain("<h2");
    expect(html).toContain("Zeekr X</h2>");
  });

  it("names the flap by the powertrain when no labels are given", () => {
    const html = renderToStaticMarkup(h(VehicleStage, { ...base, powertrain: "bev", zones: ["charge"], onZoneSelect: () => {} }));
    expect(html).toContain('aria-label="Зарядный порт"');
    const unknown = renderToStaticMarkup(h(VehicleStage, { ...base, zones: ["charge"], onZoneSelect: () => {} }));
    expect(unknown).toContain('aria-label="Лючок бака или зарядки"');
  });

  it("uses custom labels and links on the server", () => {
    const html = renderToStaticMarkup(
      h(VehicleStage, {
        ...base,
        zones: ["charge", "door"],
        zoneLabels: zoneLabelsFor("ice"),
        zoneHrefs: { charge: "/catalog?zone=charge" },
        headingLevel: 3,
      }),
    );
    expect(html).toContain('href="/catalog?zone=charge"');
    expect(html).toContain('aria-label="Лючок бензобака"');
    expect(html).not.toContain("<button");
    // A zone without a link is only a marker, hidden from assistive technology.
    expect(html).not.toContain('aria-label="Двери"');
    expect(html).toContain("<h3");
  });

  it("positions hotspots in percent of the car box", () => {
    const html = renderToStaticMarkup(h(VehicleStage, { ...base, zones: ["wheel-front"], onZoneSelect: () => {} }));
    const { left, top } = zonePosition("crossover", "wheel-front");
    expect(html).toContain(`left:${left}%;top:${top}%`);
  });
});
