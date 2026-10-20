import { describe, expect, it } from "vitest";
import { catalogGroupName, driveText, fuelText } from "../catalog-names";

describe("catalogGroupName", () => {
  it("gives the 17VIN top-level groups Russian names without the number", () => {
    expect(catalogGroupName("01 Engine Package")).toEqual({ ru: "Двигатель", original: "01 Engine Package" });
    expect(catalogGroupName("03 Chassis assembly").ru).toBe("Шасси и подвеска");
    expect(catalogGroupName("06 Body and Body Accessories").ru).toBe("Кузов и аксессуары");
    expect(catalogGroupName("10 Electrical equipment").ru).toBe("Электрооборудование");
    expect(catalogGroupName("Brake system").ru).toBe("Тормозная система");
    expect(catalogGroupName("B1 Chassis")).toEqual({ ru: "Шасси и подвеска", original: "B1 Chassis" });
  });

  it("keeps an unknown English name as it came, marked as English", () => {
    expect(catalogGroupName("Telematics module bracket")).toEqual({ ru: "Telematics module bracket", original: null, lang: "en" });
    expect(catalogGroupName("07 Something new")).toEqual({ ru: "Something new", original: null, lang: "en" });
    expect(catalogGroupName("前制动")).toEqual({ ru: "前制动", original: null });
    expect(catalogGroupName("Тормоза")).toEqual({ ru: "Тормоза", original: null });
    expect(catalogGroupName(null).ru).toBe("");
  });
});

describe("driveText and fuelText", () => {
  it("translates the trim facts of a decode", () => {
    expect(driveText("Front-engine FWD").ru).toBe("передний привод, двигатель спереди");
    expect(driveText("Rear-engine RWD").ru).toBe("задний привод, двигатель сзади");
    expect(driveText("Dual-motor AWD").ru).toBe("полный привод, два электромотора");
    expect(driveText("Something")).toEqual({ ru: "Something", original: null, lang: "en" });
    expect(driveText("").ru).toBe("");
    expect(fuelText("PHEV").ru).toBe("подключаемый гибрид");
    expect(fuelText("BEV").ru).toBe("электро");
    expect(fuelText("EREV").ru).toBe("последовательный гибрид");
    expect(fuelText("Hydrogen")).toMatchObject({ ru: "Hydrogen", lang: "en" });
  });
});
