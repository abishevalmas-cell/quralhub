import { describe, expect, it } from "vitest";
import { parseQuery, type ParsedQuery } from "@/lib/taxonomy";

// ISO 3779 check digit, reimplemented here so these tests do not depend on lib/vin.
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const value = (c: string) => {
  if (/\d/.test(c)) return Number(c);
  const table = "ABCDEFGH-JKLMN-P-R-STUVWXYZ".replace(/-/g, "");
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 7, 9, 2, 3, 4, 5, 6, 7, 8, 9];
  return values[table.indexOf(c)];
};
function synthVin(template: string): string {
  const sum = [...template].reduce((acc, c, i) => (i === 8 ? acc : acc + value(c) * WEIGHTS[i]), 0);
  const check = sum % 11 === 10 ? "X" : String(sum % 11);
  return template.slice(0, 8) + check + template.slice(9);
}

// Synthetic VINs: obviously fake manufacturer and serial, valid check digit.
const VIN_A = synthVin("LSYNTH00_R0000001");
const VIN_B = synthVin("LTESTCAR_S0000042");

type Expect = Partial<Pick<ParsedQuery, "axis" | "side" | "position" | "qty" | "missing" | "kind">>;
type Case = [input: string, partId: string | null, expected?: Expect];

const top = (input: string) => parseQuery(input).matches[0]?.partType.id ?? null;

function check([input, partId, expected = {}]: Case) {
  const result = parseQuery(input);
  expect(result.matches[0]?.partType.id ?? null, input).toBe(partId);
  for (const [key, val] of Object.entries(expected)) expect(result[key as keyof ParsedQuery], `${input}: ${key}`).toEqual(val);
}

describe("parseQuery: examples from the spec", () => {
  const cases: Case[] = [
    ["поворотник в зеркале", "mirror-turn-signal", { missing: ["side"] }],
    ["щетки стеклоочистителя", "wiper-blade"],
    ["лобовое стекло", "windshield"],
    ["стойка стабилизатора", "stabilizer-link", { missing: ["axis", "side"] }],
    ["пыльник шруса", "cv-boot"],
    ["передняя левая фара", "headlight", { axis: "front", side: "left", missing: [] }],
    ["колодки задние", "brake-pads", { axis: "rear", side: null, missing: [] }],
    ["пневмобаллон передний правый", "air-spring", { axis: "front", side: "right", missing: [] }],
    ["стук спереди справа", null, { axis: "front", side: "right", missing: [], kind: "text" }],
  ];
  it.each(cases)("%s", (...c) => check(c));

  it("puts the longer phrase above its parts", () => {
    const ids = parseQuery("поворотник в зеркале").matches.map((m) => m.partType.id);
    expect(ids.indexOf("mirror-turn-signal")).toBeLessThan(ids.indexOf("mirror"));
    expect(ids).not.toContain("windshield");
    expect(parseQuery("щетки стеклоочистителя").matches.map((m) => m.partType.group)).not.toContain("glass");
    expect(parseQuery("стойка стабилизатора").matches[0].score).toBeGreaterThan(
      parseQuery("стойка стабилизатора").matches.find((m) => m.partType.id === "shock-absorber")!.score,
    );
  });
});

describe("parseQuery: Russian phrases", () => {
  const cases: Case[] = [
    ["зеркало", "mirror", { missing: ["side"] }],
    ["стекло зеркала правое", "mirror-glass", { side: "right" }],
    ["поворотник на левом зеркале", "mirror-turn-signal", { side: "left", missing: [] }],
    ["крышка зеркала", "mirror-cover"],
    ["зеркало заднего вида", "interior-mirror", { axis: null }],
    ["дворники", "wiper-blade"],
    ["задний дворник", "rear-wiper-blade"],
    ["моторчик дворников", "wiper-motor"],
    ["лобовуха", "windshield"],
    ["заднее стекло", "rear-window-glass"],
    ["стекло задней левой двери", "side-window-glass", { axis: "rear", side: "left", missing: [] }],
    ["стойка амортизатора передняя левая", "shock-absorber", { axis: "front", side: "left" }],
    ["амортизаторы задние", "shock-absorber", { axis: "rear", missing: ["side"] }],
    ["амартизатор", "shock-absorber"],
    ["опора амортизатора", "strut-mount"],
    ["опорный подшипник", "strut-bearing"],
    ["подшипник ступицы задний правый", "wheel-bearing", { axis: "rear", side: "right" }],
    ["шаровая", "ball-joint"],
    ["рулевой наконечник левый", "tie-rod-end", { side: "left", missing: [] }],
    ["рулевая рейка", "steering-rack"],
    ["пыльник рулевой рейки", "steering-rack-boot"],
    ["рычаг передний левый нижний", "lower-arm", { axis: "front", side: "left", position: "lower" }],
    ["верхний рычаг", "upper-arm", { position: "upper" }],
    ["сайленблок рычага", "arm-bushing"],
    ["втулки стабилизатора", "stabilizer-bushing"],
    ["тормозные диски передние", "brake-disc", { axis: "front" }],
    ["диски r18", "wheel-rim"],
    ["суппорт задний правый", "brake-caliper", { axis: "rear", side: "right" }],
    ["датчик абс передний левый", "abs-sensor"],
    ["колодок", "brake-pads"],
    ["салонный фильтр", "cabin-filter"],
    ["фильтр масляный", "oil-filter"],
    ["воздушный фильтр", "air-filter"],
    ["свечи зажигания", "spark-plug"],
    ["антифриз", "coolant"],
    ["аккумулятор", "battery-12v"],
    ["акб", "battery-12v"],
    ["высоковольтная батарея", "hv-battery"],
    ["бортовое зарядное устройство", "obc"],
    ["зарядный порт", "charging-port"],
    ["DC-DC преобразователь", "dcdc"],
    ["электрическая помпа", "electric-coolant-pump"],
    ["помпа", "water-pump"],
    ["радиатор кондиционера", "condenser"],
    ["компрессор кондиционера", "ac-compressor"],
    ["компрессор пневмоподвески", "air-suspension-compressor"],
    ["радиатор", "radiator"],
    ["решетка радиатора", "grille"],
    ["бампер передний", "bumper", { axis: "front", missing: [] }],
    ["бампер", "bumper", { missing: ["axis"] }],
    ["кронштейн заднего бампера левый", "bumper-bracket", { axis: "rear", side: "left" }],
    ["капот", "hood"],
    ["амортизатор капота", "hood-strut"],
    ["крыло переднее правое", "fender", { side: "right" }],
    ["заднее крыло левое", "rear-quarter-panel", { side: "left" }],
    ["ручка двери передней правой", "door-handle", { axis: "front", side: "right" }],
    ["дверь", "door", { missing: ["axis", "side"] }],
    ["крышка багажника", "tailgate"],
    ["амортизатор багажника", "tailgate-strut"],
    ["противотуманка левая", "fog-lamp", { side: "left" }],
    ["заглушка противотуманки", "fog-lamp-cover"],
    ["задний фонарь правый", "tail-light", { side: "right" }],
    ["задняя фара", "tail-light"],
    ["дхо", "drl"],
    ["стоп сигнал", "third-brake-light"],
    ["радар круиза", "front-radar"],
    ["датчик парковки задний", "parking-sensor", { axis: "rear", missing: [] }],
    ["камера заднего вида", "rear-camera", { axis: null }],
    ["смарт ключ", "smart-key"],
    ["экран мультимедиа", "central-screen"],
    ["приборка", "instrument-cluster"],
    ["датчик давления в шинах", "tpms-sensor"],
    ["датчик давления масла", "oil-pressure-sensor"],
    ["стеклоподьемник задний левый", "window-regulator", { axis: "rear", side: "left" }],
    ["стеклоподъёмник", "window-regulator"],
    ["подушка безопасности водителя", "airbag"],
    ["подушка двигателя", "engine-mount"],
    ["ремень безопасности", "seat-belt"],
    ["ремень генератора", "drive-belt"],
    ["цепь грм", "timing-chain"],
    ["термостат", "thermostat"],
    ["турбина", "turbocharger"],
    ["глушитель", "exhaust-muffler"],
    ["защита картера", "underbody-shield"],
    ["внутренний шрус левый", "cv-joint", { position: "inner", side: "left" }],
    ["привод правый", "drive-shaft", { side: "right" }],
    ["сигнал", "horn"],
    ["фаркоп", "tow-hitch"],
    ["моторчик печки", "heater-blower"],
    ["нужна фара на машину пожалуйста", "headlight"],
    ["разбил лобовое", "windshield"],
    ["пл амортизатор", "shock-absorber", { axis: "front", side: "left" }],
    ["зп суппорт", "brake-caliper", { axis: "rear", side: "right" }],
    ["подшипник ступицы передний левый и правый", "wheel-bearing", { axis: "front", side: null }],
  ];
  it.each(cases)("%s", (...c) => check(c));

  it("returns at most 5 matches, best first", () => {
    const { matches } = parseQuery("стекло");
    expect(matches.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < matches.length; i++) expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score);
    expect(matches[0].matched).toBe("стекло");
  });

  it("does not take a tow hitch for a headlight", () => {
    expect(parseQuery("фаркоп").matches.map((m) => m.partType.id)).not.toContain("headlight");
  });

  it("finds nothing in noise", () => {
    expect(parseQuery("здравствуйте, сколько стоит?").matches).toEqual([]);
    expect(parseQuery("стучит что-то").matches).toEqual([]);
  });
});

describe("parseQuery: Kazakh, Uzbek, English, Chinese", () => {
  const cases: Case[] = [
    ["ауа сүзгісі", "air-filter"],
    ["май сүзгісі", "oil-filter"],
    ["алдыңғы әйнек", "windshield", { axis: "front" }],
    ["сол жақ айна", "mirror", { side: "left", missing: [] }],
    ["оң жақ айна", "mirror", { side: "right" }],
    ["moy filtri", "oil-filter"],
    ["havo filtri", "air-filter"],
    ["old oyna", "windshield"],
    ["chap old eshik", "door", { axis: "front", side: "left", missing: [] }],
    ["o'ng orqa eshik", "door", { axis: "rear", side: "right" }],
    ["oʻng oyna eshik oynasi", "side-window-glass", { side: "right" }],
    ["akkumulyator", "battery-12v"],
    ["front bumper", "bumper", { axis: "front" }],
    ["rear shock absorber LH", "shock-absorber", { axis: "rear", side: "left" }],
    ["左前大灯", "headlight", { axis: "front", side: "left" }],
    ["前保险杠支架", "bumper-bracket"],
    ["ABS泵", "abs-unit"],
    ["右前空气弹簧", "air-spring", { axis: "front", side: "right" }],
  ];
  it.each(cases)("%s", (...c) => check(c));

  it("does not read Russian «он» as Kazakh «оң»", () => {
    expect(parseQuery("он стучит фара").side).toBeNull();
  });
});

describe("parseQuery: quantity", () => {
  const cases: [string, number | null][] = [
    ["колодки 2шт", 2],
    ["колодки 4 шт", 4],
    ["2 амортизатора", 2],
    ["две фары", 2],
    ["пару колодок", 2],
    ["передние колодки х2", 2],
    ["колодки x2", 2],
    ["колодки ×4", 4],
    ["Jetour X70 фара", null],
    ["три в одном", null],
    ["фара", null],
  ];
  it.each(cases)("%s → %s", (input, qty) => expect(parseQuery(input).qty).toBe(qty));
});

describe("parseQuery: OE numbers", () => {
  it.each(["C385F270502-1300", "14921518-00", "6608104965C15", "1044321-00-C", "3502110XKZ16A", "4050023800"])("%s", (oe) => {
    const result = parseQuery(oe);
    expect(result.kind).toBe("oe");
    expect(result.oe).toBe(oe);
    expect(result.vinCandidate).toBeUndefined();
  });

  it("uppercases and fixes Cyrillic look-alikes", () => {
    expect(parseQuery("c385f270502-1300").oe).toBe("C385F270502-1300");
    expect(parseQuery("С385F270502-1300").oe).toBe("C385F270502-1300"); // first letter is Cyrillic С
  });

  it("keeps the text next to a part number", () => {
    const result = parseQuery("колодки передние C385F270502-1300, 2 шт");
    expect(result).toMatchObject({ kind: "oe", oe: "C385F270502-1300", axis: "front", qty: 2 });
    expect(result.matches[0].partType.id).toBe("brake-pads");
    expect(result.text).not.toContain("c385");
  });

  it.each(["2021", "150000", "пробег 5000км", "87011234567", "+7 701 123 45 67", "Haval H6", "12v", "205/55R16", "12.05.2024", "60ah"])(
    "not an OE: %s",
    (input) => {
      const result = parseQuery(input);
      expect(result.oe).toBeUndefined();
      expect(result.kind).toBe("text");
    },
  );
});

describe("parseQuery: VIN", () => {
  it("detects a VIN", () => {
    expect(parseQuery(VIN_A)).toMatchObject({ kind: "vin", vinCandidate: VIN_A, matches: [] });
    expect(parseQuery(VIN_B.toLowerCase()).vinCandidate).toBe(VIN_B);
  });

  it("joins a VIN typed with spaces", () => {
    const spaced = `${VIN_A.slice(0, 3)} ${VIN_A.slice(3, 9)} ${VIN_A.slice(9, 13)} ${VIN_A.slice(13)}`;
    expect(parseQuery(spaced)).toMatchObject({ kind: "vin", vinCandidate: VIN_A });
    expect(parseQuery(`VIN: ${VIN_B}`).vinCandidate).toBe(VIN_B);
  });

  it("handles a VIN mixed with text", () => {
    const result = parseQuery(`фара левая ${VIN_A}`);
    expect(result).toMatchObject({ kind: "vin", vinCandidate: VIN_A, side: "left", missing: [] });
    expect(result.matches[0].partType.id).toBe("headlight");
    expect(result.oe).toBeUndefined();
    expect(result.text).toBe("фара левая");
  });

  it("handles a VIN together with a part number", () => {
    const result = parseQuery(`${VIN_B} 14921518-00`);
    expect(result).toMatchObject({ kind: "vin", vinCandidate: VIN_B, oe: "14921518-00" });
  });

  it("maps Cyrillic look-alike letters typed on a Russian layout", () => {
    const cyrillic = VIN_A.replace("Y", "У").replace("T", "Т").replace("H", "Н");
    expect(cyrillic).not.toBe(VIN_A);
    expect(parseQuery(cyrillic).vinCandidate).toBe(VIN_A);
  });

  it("reports a 17-character VIN with I, O or Q as vinLike", () => {
    const typo = VIN_A.slice(0, 12) + "O" + VIN_A.slice(13);
    const result = parseQuery(typo);
    expect(result.kind).toBe("vin");
    expect(result.vinCandidate).toBeUndefined();
    expect(result.vinLike).toBe(typo);
    expect(result.oe).toBeUndefined();
  });

  it("does not take 16 or 18 characters for a VIN", () => {
    expect(parseQuery(VIN_A.slice(0, 16)).vinCandidate).toBeUndefined();
    expect(parseQuery(VIN_A + "1").vinCandidate).toBeUndefined();
  });
});

describe("parseQuery: empty input", () => {
  it.each(["", "   ", "?!", "—"])("%j", (input) => {
    expect(parseQuery(input)).toMatchObject({ kind: "empty", matches: [], axis: null, side: null, qty: null, missing: [] });
  });

  it("accepts null and undefined", () => {
    expect(parseQuery(null).kind).toBe("empty");
    expect(parseQuery(undefined).kind).toBe("empty");
  });

  it("normalizes text", () => {
    expect(parseQuery("  Ёлка, ФАРА!! ").normalized).toBe("елка фара");
    expect(top("Фара")).toBe("headlight");
  });
});

describe("parseQuery: car names and part numbers are not VINs", () => {
  it.each(["Chery Tiggo 7 Pro Max", "Geely Atlas Pro 2023", "Changan CS55 Plus 2023", "фара Haval H6 2021"])("%s", (input) => {
    const result = parseQuery(input);
    expect(result.kind).not.toBe("vin");
    expect(result.vinCandidate).toBeUndefined();
    expect(result.vinLike).toBeUndefined();
  });

  it("keeps a part number next to a model name", () => {
    expect(parseQuery("4050023800 Haval H6")).toMatchObject({ kind: "oe", oe: "4050023800", text: "haval h6" });
    expect(parseQuery("6608104965C15 left")).toMatchObject({ kind: "oe", oe: "6608104965C15", side: "left" });
  });

  it("joins VIN groups that look like a VIN", () => {
    const fiveLetters = `${VIN_A.slice(0, 5)} ${VIN_A.slice(5, 11)} ${VIN_A.slice(11)}`;
    expect(VIN_A.slice(0, 5)).toMatch(/^[A-Z]{5}$/);
    expect(parseQuery(fiveLetters).vinCandidate).toBe(VIN_A); // valid check digit
    const wrong = VIN_A.slice(0, 8) + (VIN_A[8] === "1" ? "2" : "1") + VIN_A.slice(9);
    expect(parseQuery(`${wrong.slice(0, 4)} ${wrong.slice(4, 8)} ${wrong.slice(8, 12)} ${wrong.slice(12)}`).vinCandidate).toBe(wrong);
    // Wrong check digit and a five-letter word: more likely a car name than a VIN.
    expect(parseQuery(`${wrong.slice(0, 5)} ${wrong.slice(5, 11)} ${wrong.slice(11)}`).vinCandidate).toBeUndefined();
  });

  it("reports vinLike only for a single 17-character token", () => {
    const typo = VIN_A.slice(0, 12) + "O" + VIN_A.slice(13);
    expect(parseQuery(`${typo.slice(0, 8)} ${typo.slice(8)}`).vinLike).toBeUndefined();
  });
});

describe("parseQuery: numbers that are not part numbers", () => {
  it.each([
    "фара 2021-2023",
    "8-701-123-45-67",
    "+998 90 123 45 67",
    "батарея 100kWh",
    "цена 1.500.000",
    "50.000 тенге",
    "масло 5W-30",
    "масло 10W-40",
    "фреон R134a",
    "шина 225-45R17",
  ])("%s", (input) => {
    const result = parseQuery(input);
    expect(result.oe).toBeUndefined();
    expect(result.kind).toBe("text");
  });

  it.each(["1001100-02-00", "T11-3502010", "J68-3502080AB"])("still an OE: %s", (oe) => {
    expect(parseQuery(oe)).toMatchObject({ kind: "oe", oe });
  });
});

describe("parseQuery: placement in Chinese, Kazakh, Uzbek and shorthand", () => {
  const cases: Case[] = [
    ["左后视镜", "mirror", { side: "left", axis: null, missing: [] }],
    ["右后视镜总成", "mirror", { side: "right", axis: null }],
    ["前保险杠", "bumper", { axis: "front", missing: [] }],
    ["后刹车片", "brake-pads", { axis: "rear", missing: [] }],
    ["左右大灯", "headlight", { side: null }],
    ["оң айна", "mirror", { side: "right", missing: [] }],
    ["чап олд эшик", "door", { axis: "front", side: "left", missing: [] }],
    ["орқа бампер", "bumper", { axis: "rear" }],
    ["ўнг кўзгу", "mirror", { side: "right" }],
    ["олд ойна", "windshield", { axis: "front" }],
    ["з/п амортизатор", "shock-absorber", { axis: "rear", side: "right", missing: [] }],
    ["п/л фара", "headlight", { axis: "front", side: "left" }],
  ];
  it.each(cases)("%s", (...c) => check(c));
});

describe("parseQuery: ordinals and measures are not quantities", () => {
  const cases: [string, number | null][] = [
    ["5-я дверь", null],
    ["2 ряд сидений", null],
    ["12 вольт аккумулятор", null],
    ["16 дюймов диски", null],
    ["4 литра масла", null],
    ["два литра антифриза", null],
    ["2 комплекта колодок", 2],
    ["две двери", 2],
    ["2 дверные ручки", 2],
  ];
  it.each(cases)("%s → %s", (input, qty) => expect(parseQuery(input).qty).toBe(qty));

  it("reads «5-я дверь» as the tailgate", () => expect(top("5-я дверь")).toBe("tailgate"));
});

describe("parseQuery: words after «с», «для», «без» describe the part", () => {
  const cases: Case[] = [
    ["передний бампер с парктрониками", "bumper", { axis: "front" }],
    ["лобовое стекло с камерой", "windshield"],
    ["зеркало с поворотником", "mirror"],
    ["ступица передняя в сборе с подшипником", "wheel-hub"],
    ["масло для двигателя", "engine-oil"],
    ["дверь без стекла", "door"],
    ["ремень безопасности с пиропатроном", "seat-belt"],
  ];
  it.each(cases)("%s", (...c) => check(c));

  it("keeps the described part as a lower alternative", () => {
    const ids = parseQuery("передний бампер с парктрониками").matches.map((m) => m.partType.id);
    expect(ids.slice(0, 2)).toEqual(["bumper", "parking-sensor"]);
  });
});

describe("parseQuery: one generic word suggests candidates", () => {
  it("lists the filters for «фильтр»", () => {
    const ids = parseQuery("фильтр").matches.map((m) => m.partType.id);
    expect(ids.slice(0, 4)).toEqual(["cabin-filter", "air-filter", "oil-filter", "fuel-filter"]);
  });

  it("lists sensors for «датчик» and mirrors for «left mirror»", () => {
    expect(parseQuery("датчик").matches.length).toBe(5);
    for (const m of parseQuery("датчик").matches) expect(m.matched).toMatch(/^датчик/);
    expect(parseQuery("left mirror")).toMatchObject({ side: "left" });
    expect(top("left mirror")).toBe("mirror");
  });

  it("does not ask for axis or side before the part is known", () => {
    expect(parseQuery("датчик").missing).toEqual([]);
    expect(parseQuery("датчик abs").missing).toEqual(["axis", "side"]);
  });

  it("scores candidates below any complete match", () => {
    expect(parseQuery("фильтр").matches[0].score).toBeLessThan(parseQuery("салонный фильтр").matches[0].score);
  });

  it("does not make up a part from placement words alone", () => {
    expect(parseQuery("передний левый").matches).toEqual([]);
    expect(parseQuery("стук спереди справа").matches).toEqual([]);
  });
});

describe("parseQuery: more phrases", () => {
  const cases: Case[] = [
    ["калодки передние", "brake-pads", { axis: "front" }],
    ["тармазные колодки", "brake-pads"],
    ["акум", "battery-12v"],
    ["ручник", "parking-brake-motor"],
    ["складывание зеркала", "mirror-motor"],
    ["абсорбер бампера", "bumper-beam"],
    ["кондиционер не холодит", "ac-compressor"],
    ["помпа охлаждения батареи", "electric-coolant-pump"],
    ["ручка багажника", "tailgate-handle"],
    ["ближний свет", "headlight-bulb"],
    ["щиток приборов", "instrument-cluster"],
    ["рулевая тяга", "tie-rod"],
    ["контроллер фар", "headlight-module"],
    ["雨刮马达", "wiper-motor"],
  ];
  it.each(cases)("%s", (...c) => check(c));

  it("does not read a generic Chinese «motor» as a starter", () => {
    expect(parseQuery("雨刮马达").matches.map((m) => m.partType.id)).not.toContain("starter");
  });
});

describe("parseQuery: robustness", () => {
  it("cuts very long input", () => {
    const result = parseQuery("фара ".repeat(20000));
    expect(result.normalized.length).toBeLessThanOrEqual(1000);
    expect(top("фара ".repeat(20000))).toBe("headlight");
  });

  it("survives punctuation runs and odd characters", () => {
    expect(parseQuery("!".repeat(50000)).kind).toBe("empty");
    expect(parseQuery("\u0000​ фара 🚗").matches[0].partType.id).toBe("headlight");
  });
});
