// Synthetic VINs only: real WMI prefixes with made-up VDS and serials. Check digits were cross-checked
// with an independent implementation. Never put real customer VINs here.
export const VINS = {
  bydLgx: "LGXCE4CB4R0999001",
  bydLc0: "LC0CE6CD6R0999002",
  geelyL6t: "L6TCX2E70R0999003",
  changanLs6: "LS6A2E0Z7P0999004",
  liAuto: "HLXAB1C24R0999005",
  chery: "LVVDB11B8S0999008",
  unknownChina: "LFZAB3C49R0999009",
  checkX: "LGXCE4CBXR0999018",
  checkZero: "LGXCE4CB0R0999013",
  europe: "WVWZZZ1K080999006",
  russia: "XTA210990R0999007",
} as const;

// Replaces the character at a 1-based position.
export const setAt = (vin: string, position: number, c: string) =>
  vin.slice(0, position - 1) + c + vin.slice(position);
