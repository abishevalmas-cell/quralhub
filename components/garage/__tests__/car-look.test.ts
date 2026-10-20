import { describe, expect, it } from "vitest";
import { carColorById, DEFAULT_PAINT } from "@/components/car/colors";
import { getModel } from "@/lib/catalog";
import { carLook } from "../garage-car";

describe("carLook", () => {
  it("draws the catalog model's body in the paint the owner chose", () => {
    const model = getModel("tank-300");
    expect(model).toBeTruthy();
    expect(carLook({ modelId: "tank-300", color: "red", brand: null, model: null, year: null })).toEqual({
      body: model!.body,
      color: carColorById("red")!.hex,
    });
  });

  it("finds the model by the decoded name and falls back to the model's usual paint", () => {
    const look = carLook({ modelId: null, color: null, brand: "Zeekr", model: "001", year: 2023 });
    expect(look).toEqual({ body: "liftback", color: carColorById(getModel("zeekr-001")!.defaultColor)!.hex });
  });

  it("uses a neutral crossover for a car outside the catalog and nothing without a car", () => {
    expect(carLook({ modelId: null, color: "nope", brand: "Unknown", model: "Car", year: 2020 })).toEqual({
      body: "crossover",
      color: DEFAULT_PAINT,
    });
    expect(carLook(null)).toBeNull();
    expect(carLook(undefined)).toBeNull();
  });
});
