import { describe, expect, it } from "vitest";
import { assortmentFor } from "@/lib/catalog";
import { allItems, itemsFor, popularMix } from "../assortment-view";
import { FAVORITES_MAX, parseFavorites, toggleFavorite } from "../favorites";

describe("assortment grid", () => {
  const phev = assortmentFor(["phev"]);

  it("mixes popular parts of every group so the first row is varied", () => {
    const mix = popularMix(phev);
    expect(mix.every((i) => i.popular)).toBe(true);
    expect(new Set(mix.map((i) => i.id)).size).toBe(mix.length);
    // One part from each group before a second one from any group.
    expect(new Set(mix.slice(0, phev.length).map((i) => i.groupId)).size).toBe(phev.length);
    expect(mix.length).toBe(phev.reduce((n, g) => n + g.popularCount, 0));
  });

  it("lists a group with its popular parts first and the group icon", () => {
    const brakes = itemsFor(phev, "brakes");
    expect(brakes[0]).toMatchObject({ id: "brake-pads", popular: true, icon: "disc", groupId: "brakes" });
    expect(brakes.length).toBe(phev.find((g) => g.id === "brakes")!.count);
    expect(brakes.findIndex((i) => !i.popular)).toBe(brakes.filter((i) => i.popular).length);
    expect(itemsFor(phev, "powertrain").length).toBeGreaterThan(0);
    // An electric car has no engine group at all.
    expect(itemsFor(assortmentFor(["bev"]), "powertrain")).toEqual([]);
  });

  it("shows favorites newest first and skips parts the car does not have", () => {
    const bev = assortmentFor(["bev"]);
    expect(itemsFor(bev, "favorites", ["hv-battery", "oil-filter", "brake-pads"]).map((i) => i.id)).toEqual(["hv-battery", "brake-pads"]);
    expect(allItems(bev).some((i) => i.id === "oil-filter")).toBe(false);
  });
});

describe("favorites storage", () => {
  it("reads only well-formed lists", () => {
    expect(parseFavorites('["brake-pads","brake-pads","headlight"]')).toEqual(["brake-pads", "headlight"]);
    for (const raw of [null, "", "nope", "{}", '[1,{"a":2}]', '["<script>"]']) expect(parseFavorites(raw)).toEqual([]);
    expect(parseFavorites(JSON.stringify(Array.from({ length: 300 }, (_, i) => `p-${i}`)))).toHaveLength(FAVORITES_MAX);
  });

  it("adds to the front and removes on a second tap", () => {
    expect(toggleFavorite(["a"], "b")).toEqual(["b", "a"]);
    expect(toggleFavorite(["b", "a"], "b")).toEqual(["a"]);
  });
});
