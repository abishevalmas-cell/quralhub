// REFERENCE DATA, NOT A FITMENT SOURCE. Years are model-line years on the Chinese market (the first year we are
// confident of), powertrains are what the line is sold with. Both must be checked against the VIN decode of the
// actual car: a model listed here says nothing about which parts fit it. Aliases are export and local names of the
// same car, not lookalikes; a model we are not sure exists is left out rather than guessed.
import { getBrand } from "../brands";
import type { BodyType, BrandId, CarColorId, CarModel, Market, Powertrain } from "../types";

type Fields = {
  zh?: string;
  aka?: string[];
  body: BodyType;
  pt: Powertrain[];
  /** "2021" (still produced) or "2016-2022". */
  years: string;
  in: Market[];
  color: CarColorId;
  popular?: boolean;
  segment?: string;
  /** false: no spare wheel on the tailgate. */
  spare?: false;
};

const ALL: Market[] = ["KZ", "UZ", "KG", "RU"];
const KZ_KG_RU: Market[] = ["KZ", "KG", "RU"];
const KZ_UZ_RU: Market[] = ["KZ", "UZ", "RU"];
const KZ_RU: Market[] = ["KZ", "RU"];
const RU: Market[] = ["RU"];

function maker(brandId: BrandId) {
  const brand = getBrand(brandId);
  if (!brand) throw new Error(`Unknown brand ${brandId}`);
  return (slug: string, model: string, f: Fields): CarModel => {
    const [from, to] = f.years.split("-").map(Number);
    return {
      id: `${brandId}-${slug}`,
      brandId,
      brand: brand.name,
      brandZh: brand.nameZh,
      model,
      ...(f.zh ? { modelZh: f.zh } : {}),
      aliases: f.aka ?? [],
      body: f.body,
      powertrains: f.pt,
      yearFrom: from,
      yearTo: to ?? null,
      ...(f.segment ? { segment: f.segment } : {}),
      popularIn: f.in,
      popular: f.popular ?? false,
      defaultColor: f.color,
      ...(f.spare === false ? { spare: false } : {}),
    };
  };
}

const byd = maker("byd");
const geely = maker("geely");
const chery = maker("chery");
const exeed = maker("exeed");
const jetour = maker("jetour");
const omoda = maker("omoda");
const jaecoo = maker("jaecoo");
const tenet = maker("tenet");
const haval = maker("haval");
const tank = maker("tank");
const gwm = maker("great-wall");
const changan = maker("changan");
const deepal = maker("deepal");
const li = maker("li-auto");
const zeekr = maker("zeekr");
const xiaomi = maker("xiaomi");
const aito = maker("aito");
const voyah = maker("voyah");
const hongqi = maker("hongqi");
const leap = maker("leapmotor");
const lynk = maker("lynk-co");
const gac = maker("gac");
const kaiyi = maker("kaiyi");
const dongfeng = maker("dongfeng");
const bestune = maker("bestune");

// Within a brand the most common cars come first: on equal matches the earlier entry wins.
export const MODEL_ROWS: CarModel[] = [
  // BYD
  byd("song-plus-dmi", "Song Plus DM-i", {
    zh: "宋PLUS DM-i",
    aka: ["Song Plus", "宋PLUS", "Seal U DM-i", "Sealion 6"],
    body: "crossover",
    pt: ["phev"],
    years: "2021",
    in: ALL,
    color: "white",
    popular: true,
    segment: "Средний кроссовер",
  }),
  byd("song-plus-ev", "Song Plus EV", {
    zh: "宋PLUS EV",
    aka: ["Seal U"],
    body: "crossover",
    pt: ["bev"],
    years: "2021",
    in: ALL,
    color: "graphite",
    popular: true,
    segment: "Средний кроссовер",
  }),
  byd("qin-plus-dmi", "Qin Plus DM-i", {
    zh: "秦PLUS DM-i",
    aka: ["Chazor", "Qin Plus", "秦PLUS"],
    body: "sedan",
    pt: ["phev"],
    years: "2021",
    in: ALL,
    color: "white",
    popular: true,
    segment: "Компактный седан",
  }),
  byd("han", "Han", { zh: "汉", body: "sedan", pt: ["bev", "phev"], years: "2020", in: ALL, color: "black", popular: true, segment: "Седан бизнес-класса" }),
  byd("seal", "Seal", { zh: "海豹", body: "sedan", pt: ["bev", "phev"], years: "2022", in: KZ_KG_RU, color: "blue", popular: true, segment: "Седан среднего класса" }),
  byd("yuan-plus", "Yuan Plus", {
    zh: "元PLUS",
    aka: ["Atto 3"],
    body: "crossover",
    pt: ["bev"],
    years: "2022",
    in: ALL,
    color: "white",
    popular: true,
    segment: "Компактный кроссовер",
  }),
  byd("han-l", "Han L", { zh: "汉L", body: "sedan", pt: ["bev", "phev"], years: "2025", in: KZ_KG_RU, color: "graphite", segment: "Седан бизнес-класса" }),
  byd("tang-l", "Tang L", { zh: "唐L", body: "suv", pt: ["bev", "phev"], years: "2025", in: KZ_KG_RU, color: "black", segment: "Большой кроссовер, 7 мест" }),
  byd("tang", "Tang", { zh: "唐", body: "suv", pt: ["phev", "bev", "ice"], years: "2018", in: KZ_KG_RU, color: "black", segment: "Большой кроссовер, 7 мест" }),
  byd("song-pro", "Song Pro DM-i", {
    zh: "宋Pro DM-i",
    aka: ["Song Pro"],
    body: "crossover",
    pt: ["phev"],
    years: "2021",
    in: ALL,
    color: "silver",
    segment: "Компактный кроссовер",
  }),
  byd("song-l", "Song L", { zh: "宋L", body: "crossover", pt: ["bev", "phev"], years: "2023", in: KZ_KG_RU, color: "graphite", segment: "Купе-кроссовер" }),
  byd("song-max", "Song Max DM-i", {
    zh: "宋MAX DM-i",
    aka: ["Song Max"],
    body: "minivan",
    pt: ["phev"],
    years: "2021",
    in: KZ_RU,
    color: "white",
    segment: "Компактвэн, 7 мест",
  }),
  byd("qin-plus-ev", "Qin Plus EV", { zh: "秦PLUS EV", body: "sedan", pt: ["bev"], years: "2021", in: ALL, color: "white", segment: "Компактный седан" }),
  byd("qin-l", "Qin L DM-i", { zh: "秦L DM-i", aka: ["Qin L"], body: "sedan", pt: ["phev"], years: "2024", in: KZ_KG_RU, color: "graphite", segment: "Седан среднего класса" }),
  byd("destroyer-05", "Destroyer 05", { zh: "驱逐舰05", body: "sedan", pt: ["phev"], years: "2022", in: ALL, color: "blue", segment: "Компактный седан" }),
  byd("seal-06", "Seal 06 DM-i", { zh: "海豹06 DM-i", aka: ["Seal 06"], body: "sedan", pt: ["phev"], years: "2024", in: KZ_KG_RU, color: "silver", segment: "Седан среднего класса" }),
  byd("sealion-07", "Sealion 07", { zh: "海狮07", body: "crossover", pt: ["bev"], years: "2024", in: KZ_KG_RU, color: "graphite", segment: "Средний кроссовер" }),
  byd("frigate-07", "Frigate 07", { zh: "护卫舰07", body: "crossover", pt: ["phev"], years: "2022", in: KZ_KG_RU, color: "black", segment: "Средний кроссовер" }),
  byd("yuan-up", "Yuan Up", { zh: "元UP", aka: ["Atto 2"], body: "crossover", pt: ["bev"], years: "2024", in: ALL, color: "blue", segment: "Городской кроссовер" }),
  byd("dolphin", "Dolphin", { zh: "海豚", body: "hatchback", pt: ["bev"], years: "2021", in: ALL, color: "blue", segment: "Компактный хэтчбек" }),
  byd("seagull", "Seagull", { zh: "海鸥", aka: ["Dolphin Mini"], body: "hatchback", pt: ["bev"], years: "2023", in: ALL, color: "silver", segment: "Городской хэтчбек" }),
  byd("leopard-5", "Leopard 5", { zh: "豹5", aka: ["Bao 5"], body: "offroad", pt: ["phev"], years: "2023", in: KZ_KG_RU, color: "graphite", segment: "Внедорожник" }),

  // Geely, including the Galaxy line
  geely("monjaro", "Monjaro", { zh: "星越L", aka: ["Xingyue L"], body: "crossover", pt: ["ice"], years: "2021", in: ALL, color: "graphite", popular: true, segment: "Средний кроссовер" }),
  geely("coolray", "Coolray", {
    zh: "缤越",
    aka: ["Binyue", "Belgee X50"],
    body: "crossover",
    pt: ["ice"],
    years: "2018",
    in: ALL,
    color: "red",
    popular: true,
    segment: "Компактный кроссовер",
  }),
  geely("atlas", "Atlas", {
    zh: "博越L",
    aka: ["Boyue L"],
    body: "crossover",
    pt: ["ice"],
    years: "2023",
    in: ALL,
    color: "silver",
    popular: true,
    segment: "Средний кроссовер, второе поколение",
  }),
  geely("galaxy-e5", "Galaxy E5", { zh: "银河E5", aka: ["EX5"], body: "crossover", pt: ["bev"], years: "2024", in: ALL, color: "silver", popular: true, segment: "Компактный кроссовер" }),
  geely("atlas-pro", "Atlas Pro", { zh: "博越PRO", aka: ["Boyue Pro"], body: "crossover", pt: ["ice"], years: "2021", in: ALL, color: "graphite", segment: "Средний кроссовер" }),
  geely("tugella", "Tugella", { zh: "星越", aka: ["Xingyue", "Xingyue S"], body: "crossover", pt: ["ice"], years: "2019", in: KZ_KG_RU, color: "black", segment: "Купе-кроссовер" }),
  geely("emgrand", "Emgrand", { zh: "帝豪", body: "sedan", pt: ["ice"], years: "2021", in: ALL, color: "white", segment: "Компактный седан" }),
  geely("preface", "Preface", { zh: "星瑞", aka: ["Xingrui"], body: "sedan", pt: ["ice"], years: "2020", in: KZ_RU, color: "blue", segment: "Седан среднего класса" }),
  geely("okavango", "Okavango", { zh: "豪越", aka: ["Haoyue"], body: "crossover", pt: ["ice"], years: "2020", in: KZ_RU, color: "silver", segment: "Кроссовер, 7 мест" }),
  geely("galaxy-l6", "Galaxy L6", { zh: "银河L6", body: "sedan", pt: ["phev"], years: "2023", in: KZ_KG_RU, color: "graphite", segment: "Седан среднего класса" }),
  geely("galaxy-l7", "Galaxy L7", { zh: "银河L7", body: "crossover", pt: ["phev"], years: "2023", in: KZ_KG_RU, color: "white", segment: "Средний кроссовер" }),
  geely("galaxy-e8", "Galaxy E8", { zh: "银河E8", body: "sedan", pt: ["bev"], years: "2024", in: KZ_KG_RU, color: "black", segment: "Седан бизнес-класса" }),
  geely("starship-7", "Starship 7", {
    zh: "银河星舰7",
    aka: ["Galaxy Starship 7", "星舰7"],
    body: "crossover",
    pt: ["phev"],
    years: "2024",
    in: KZ_KG_RU,
    color: "silver",
    segment: "Средний кроссовер",
  }),
  geely("atlas-nl3", "Atlas NL-3", {
    zh: "博越",
    aka: ["Atlas", "Boyue"],
    body: "crossover",
    pt: ["ice"],
    years: "2016-2022",
    in: ALL,
    color: "graphite",
    segment: "Средний кроссовер, первое поколение",
  }),

  // Chery
  chery("tiggo-7-pro-max", "Tiggo 7 Pro Max", { body: "crossover", pt: ["ice"], years: "2022", in: ALL, color: "graphite", popular: true, segment: "Компактный кроссовер" }),
  chery("tiggo-8-pro-max", "Tiggo 8 Pro Max", { body: "suv", pt: ["ice"], years: "2022", in: ALL, color: "black", popular: true, segment: "Кроссовер, 7 мест" }),
  chery("tiggo-4-pro", "Tiggo 4 Pro", { body: "crossover", pt: ["ice"], years: "2021", in: ALL, color: "white", popular: true, segment: "Компактный кроссовер" }),
  chery("tiggo-7-pro", "Tiggo 7 Pro", { body: "crossover", pt: ["ice"], years: "2020", in: ALL, color: "silver", popular: true, segment: "Компактный кроссовер" }),
  chery("tiggo-8-pro", "Tiggo 8 Pro", { zh: "瑞虎8 PRO", aka: ["Tiggo 8 Pro e+"], body: "suv", pt: ["ice", "phev"], years: "2021", in: ALL, color: "graphite", segment: "Кроссовер, 7 мест" }),
  chery("tiggo-2-pro", "Tiggo 2 Pro", { body: "crossover", pt: ["ice"], years: "2021", in: ALL, color: "red", segment: "Городской кроссовер" }),
  chery("arrizo-8", "Arrizo 8", { zh: "艾瑞泽8", body: "sedan", pt: ["ice"], years: "2022", in: KZ_UZ_RU, color: "blue", segment: "Седан среднего класса" }),
  chery("tiggo-9", "Tiggo 9", { zh: "瑞虎9", body: "suv", pt: ["ice", "phev"], years: "2023", in: KZ_RU, color: "black", segment: "Большой кроссовер, 7 мест" }),

  // Exeed
  exeed("txl", "TXL", { body: "crossover", pt: ["ice"], years: "2019", in: KZ_RU, color: "black", popular: true, segment: "Средний кроссовер" }),
  exeed("vx", "VX", { body: "suv", pt: ["ice"], years: "2021", in: KZ_RU, color: "graphite", segment: "Большой кроссовер, 7 мест" }),
  exeed("rx", "RX", { zh: "瑶光", aka: ["Yaoguang"], body: "crossover", pt: ["ice"], years: "2023", in: KZ_RU, color: "white", segment: "Средний кроссовер" }),
  exeed("lx", "LX", { body: "crossover", pt: ["ice"], years: "2019", in: KZ_RU, color: "silver", segment: "Компактный кроссовер" }),

  // Jetour
  jetour("dashing", "Dashing", { zh: "大圣", body: "crossover", pt: ["ice"], years: "2022", in: KZ_KG_RU, color: "blue", popular: true, segment: "Компактный кроссовер" }),
  jetour("t2", "T2", {
    zh: "旅行者",
    aka: ["Traveller", "Traveler"],
    body: "offroad",
    pt: ["ice", "phev"],
    years: "2023",
    in: KZ_KG_RU,
    color: "tank-green",
    popular: true,
    segment: "Внедорожник",
  }),
  jetour("x70-plus", "X70 Plus", { body: "suv", pt: ["ice"], years: "2020", in: KZ_KG_RU, color: "silver", segment: "Кроссовер, 7 мест" }),
  jetour("x90-plus", "X90 Plus", { body: "suv", pt: ["ice"], years: "2021", in: KZ_RU, color: "black", segment: "Большой кроссовер, 7 мест" }),

  // Omoda
  omoda("c5", "C5", { aka: ["Omoda 5"], body: "crossover", pt: ["ice"], years: "2022", in: KZ_KG_RU, color: "red", popular: true, segment: "Компактный кроссовер" }),
  omoda("s5", "S5", { body: "sedan", pt: ["ice"], years: "2023", in: KZ_RU, color: "white", segment: "Компактный седан" }),
  omoda("e5", "E5", { body: "crossover", pt: ["bev"], years: "2024", in: KZ_RU, color: "graphite", segment: "Компактный кроссовер" }),

  // Jaecoo
  jaecoo("j7", "J7", { body: "crossover", pt: ["ice", "phev"], years: "2023", in: KZ_RU, color: "graphite", popular: true, segment: "Компактный кроссовер" }),
  jaecoo("j8", "J8", { body: "suv", pt: ["ice"], years: "2024", in: KZ_RU, color: "black", segment: "Большой кроссовер, 7 мест" }),

  // Tenet (Russian assembly of Chery models)
  tenet("t7", "T7", { body: "crossover", pt: ["ice"], years: "2025", in: RU, color: "graphite", segment: "Компактный кроссовер" }),
  tenet("t4", "T4", { body: "crossover", pt: ["ice"], years: "2025", in: RU, color: "white", segment: "Компактный кроссовер" }),
  tenet("t8", "T8", { body: "suv", pt: ["ice"], years: "2025", in: RU, color: "black", segment: "Кроссовер, 7 мест" }),

  // Haval
  haval("jolion", "Jolion", { zh: "初恋", aka: ["Chulian"], body: "crossover", pt: ["ice", "hev"], years: "2020", in: ALL, color: "blue", popular: true, segment: "Компактный кроссовер" }),
  // The third generation only (2020+). An earlier H6 or an H6 Coupe matches nothing and is added by hand.
  haval("h6", "H6", { body: "crossover", pt: ["ice", "hev", "phev"], years: "2020", in: ALL, color: "graphite", popular: true, segment: "Средний кроссовер" }),
  haval("dargo", "Dargo", { zh: "大狗", aka: ["Big Dog"], body: "offroad", spare: false, pt: ["ice"], years: "2020", in: KZ_KG_RU, color: "tank-green", popular: true, segment: "Кроссовер в стиле внедорожника" }),
  haval("h9", "H9", { body: "offroad", pt: ["ice"], years: "2014", in: KZ_KG_RU, color: "black", popular: true, segment: "Рамный внедорожник" }),
  haval("m6", "M6", { body: "crossover", pt: ["ice"], years: "2017", in: KZ_RU, color: "silver", segment: "Компактный кроссовер" }),
  haval("f7", "F7", { aka: ["F7x"], body: "crossover", pt: ["ice"], years: "2019", in: KZ_KG_RU, color: "blue", segment: "Компактный кроссовер" }),

  // Tank
  tank("300", "300", { body: "offroad", pt: ["ice", "phev"], years: "2021", in: KZ_KG_RU, color: "tank-green", popular: true, segment: "Рамный внедорожник" }),
  tank("500", "500", { body: "suv", pt: ["ice", "phev"], years: "2022", in: KZ_RU, color: "black", segment: "Рамный внедорожник, 7 мест" }),
  tank("400", "400", { body: "offroad", pt: ["phev"], years: "2023", in: KZ_RU, color: "graphite", segment: "Рамный внедорожник" }),

  // Great Wall
  gwm("poer", "Poer", { zh: "长城炮", aka: ["Pao", "Cannon"], body: "pickup", pt: ["ice"], years: "2019", in: KZ_KG_RU, color: "silver", segment: "Рамный пикап" }),
  gwm("wingle-7", "Wingle 7", { zh: "风骏7", body: "pickup", pt: ["ice"], years: "2018", in: KZ_RU, color: "white", segment: "Рамный пикап" }),

  // Changan
  changan("cs55-plus", "CS55 Plus", { body: "crossover", pt: ["ice"], years: "2019", in: ALL, color: "white", popular: true, segment: "Компактный кроссовер" }),
  changan("uni-k", "UNI-K", { body: "crossover", pt: ["ice", "phev"], years: "2021", in: ALL, color: "black", popular: true, segment: "Средний кроссовер" }),
  changan("uni-v", "UNI-V", { body: "liftback", pt: ["ice", "phev"], years: "2022", in: ALL, color: "red", popular: true, segment: "Лифтбек" }),
  changan("cs75-plus", "CS75 Plus", { body: "crossover", pt: ["ice"], years: "2019", in: ALL, color: "graphite", popular: true, segment: "Средний кроссовер" }),
  changan("cs35-plus", "CS35 Plus", { body: "crossover", pt: ["ice"], years: "2018", in: ALL, color: "silver", segment: "Компактный кроссовер" }),
  changan("uni-t", "UNI-T", { body: "crossover", pt: ["ice"], years: "2020", in: KZ_UZ_RU, color: "blue", segment: "Компактный кроссовер" }),
  changan("alsvin", "Alsvin", { zh: "悦翔", aka: ["Yuexiang"], body: "sedan", pt: ["ice"], years: "2018", in: KZ_UZ_RU, color: "white", segment: "Компактный седан" }),
  changan("eado-plus", "Eado Plus", { zh: "逸动PLUS", aka: ["Yidong Plus"], body: "sedan", pt: ["ice"], years: "2020", in: KZ_UZ_RU, color: "silver", segment: "Компактный седан" }),
  changan("hunter", "Hunter Plus", { aka: ["Kaicene F70"], body: "pickup", pt: ["ice"], years: "2020", in: KZ_RU, color: "graphite", segment: "Рамный пикап" }),

  // Deepal
  deepal("s07", "S07", { zh: "深蓝S07", aka: ["S7"], body: "crossover", pt: ["bev", "erev"], years: "2023", in: KZ_KG_RU, color: "blue", popular: true, segment: "Средний кроссовер" }),
  deepal("sl03", "SL03", { zh: "深蓝SL03", body: "sedan", pt: ["bev", "erev"], years: "2022", in: KZ_KG_RU, color: "white", segment: "Седан среднего класса" }),
  deepal("s05", "S05", { zh: "深蓝S05", body: "crossover", pt: ["bev", "erev"], years: "2024", in: KZ_KG_RU, color: "graphite", segment: "Компактный кроссовер" }),
  deepal("g318", "G318", { zh: "深蓝G318", body: "offroad", pt: ["erev"], years: "2024", in: KZ_KG_RU, color: "tank-green", segment: "Внедорожник" }),

  // Li Auto
  li("l7", "L7", { zh: "理想L7", body: "suv", pt: ["erev"], years: "2023", in: KZ_KG_RU, color: "graphite", popular: true, segment: "Большой кроссовер, 5 мест" }),
  li("l9", "L9", { zh: "理想L9", body: "suv", pt: ["erev"], years: "2022", in: KZ_KG_RU, color: "black", popular: true, segment: "Большой SUV, 6 мест" }),
  li("l6", "L6", { zh: "理想L6", body: "suv", pt: ["erev"], years: "2024", in: KZ_KG_RU, color: "silver", popular: true, segment: "Большой кроссовер, 5 мест" }),
  li("l8", "L8", { zh: "理想L8", body: "suv", pt: ["erev"], years: "2022", in: KZ_KG_RU, color: "graphite", segment: "Большой SUV, 6 мест" }),
  li("mega", "MEGA", { zh: "理想MEGA", body: "minivan", pt: ["bev"], years: "2024", in: KZ_KG_RU, color: "silver", segment: "Минивэн" }),
  li("one", "ONE", { zh: "理想ONE", aka: ["Li ONE"], body: "suv", pt: ["erev"], years: "2019-2022", in: KZ_KG_RU, color: "graphite", segment: "Большой кроссовер, 6 мест" }),

  // Zeekr
  zeekr("001", "001", { zh: "极氪001", body: "liftback", pt: ["bev"], years: "2021", in: ALL, color: "graphite", popular: true, segment: "Лифтбек-универсал" }),
  zeekr("x", "X", { zh: "极氪X", body: "crossover", pt: ["bev"], years: "2023", in: ALL, color: "zeekr-green", popular: true, segment: "Компактный кроссовер" }),
  zeekr("7x", "7X", { zh: "极氪7X", body: "crossover", pt: ["bev"], years: "2024", in: KZ_KG_RU, color: "white", segment: "Средний кроссовер" }),
  zeekr("007", "007", { zh: "极氪007", body: "sedan", pt: ["bev"], years: "2023", in: KZ_KG_RU, color: "blue", segment: "Седан среднего класса" }),
  zeekr("009", "009", { zh: "极氪009", body: "minivan", pt: ["bev"], years: "2022", in: KZ_KG_RU, color: "black", segment: "Минивэн" }),

  // Xiaomi
  xiaomi("su7", "SU7", { zh: "小米SU7", body: "liftback", pt: ["bev"], years: "2024", in: KZ_KG_RU, color: "blue", popular: true, segment: "Спортивный лифтбек" }),
  xiaomi("yu7", "YU7", { zh: "小米YU7", body: "crossover", pt: ["bev"], years: "2025", in: KZ_KG_RU, color: "graphite", segment: "Средний кроссовер" }),

  // AITO. The M7 is electric-only (BEV) since the 2025 update, range-extended before.
  aito("m7", "M7", { zh: "问界M7", body: "suv", pt: ["erev", "bev"], years: "2022", in: KZ_KG_RU, color: "graphite", popular: true, segment: "Большой кроссовер" }),
  aito("m5", "M5", { zh: "问界M5", body: "crossover", pt: ["erev", "bev"], years: "2022", in: KZ_KG_RU, color: "white", segment: "Средний кроссовер" }),
  aito("m9", "M9", { zh: "问界M9", body: "suv", pt: ["erev", "bev"], years: "2023", in: KZ_KG_RU, color: "black", segment: "Большой SUV, 6 мест" }),

  // Voyah
  voyah("free", "Free", { zh: "岚图FREE", body: "crossover", pt: ["erev", "bev"], years: "2021", in: KZ_KG_RU, color: "graphite", segment: "Средний кроссовер" }),
  voyah("dreamer", "Dreamer", { zh: "梦想家", body: "minivan", pt: ["phev", "bev"], years: "2022", in: KZ_RU, color: "black", segment: "Минивэн" }),

  // Hongqi
  hongqi("hs5", "HS5", { body: "crossover", pt: ["ice"], years: "2019", in: KZ_RU, color: "black", popular: true, segment: "Средний кроссовер" }),
  hongqi("h5", "H5", { body: "sedan", pt: ["ice"], years: "2018", in: KZ_RU, color: "black", segment: "Седан среднего класса" }),
  hongqi("e-hs9", "E-HS9", { body: "suv", pt: ["bev"], years: "2021", in: KZ_RU, color: "black", segment: "Большой SUV" }),
  hongqi("h9", "H9", { body: "sedan", pt: ["ice"], years: "2020", in: KZ_RU, color: "black", segment: "Седан бизнес-класса" }),

  // Leapmotor
  leap("c11", "C11", { zh: "零跑C11", body: "crossover", pt: ["bev", "erev"], years: "2021", in: ALL, color: "white", popular: true, segment: "Средний кроссовер" }),
  leap("c10", "C10", { zh: "零跑C10", body: "crossover", pt: ["bev", "erev"], years: "2024", in: ALL, color: "graphite", segment: "Средний кроссовер" }),
  leap("c16", "C16", { zh: "零跑C16", body: "suv", pt: ["bev", "erev"], years: "2024", in: KZ_KG_RU, color: "silver", segment: "Большой кроссовер, 6 мест" }),

  // Lynk & Co
  lynk("01", "01", { zh: "领克01", body: "crossover", pt: ["ice", "phev", "hev"], years: "2017", in: KZ_RU, color: "black", segment: "Компактный кроссовер" }),
  lynk("09", "09", { zh: "领克09", body: "suv", pt: ["ice", "phev"], years: "2021", in: KZ_RU, color: "graphite", segment: "Большой кроссовер, 7 мест" }),
  lynk("05", "05", { zh: "领克05", body: "crossover", pt: ["ice"], years: "2020", in: KZ_RU, color: "blue", segment: "Купе-кроссовер" }),

  // GAC
  gac("gs8", "GS8", { zh: "传祺GS8", body: "suv", pt: ["ice", "hev"], years: "2017", in: KZ_RU, color: "black", segment: "Большой кроссовер, 7 мест" }),
  gac("m8", "M8", { zh: "传祺M8", body: "minivan", pt: ["ice", "hev"], years: "2018", in: KZ_RU, color: "silver", segment: "Минивэн" }),
  gac("aion-s", "Aion S", { zh: "埃安S", body: "sedan", pt: ["bev"], years: "2019", in: KZ_UZ_RU, color: "white", segment: "Компактный седан" }),

  // Kaiyi
  kaiyi("x3-pro", "X3 Pro", { body: "crossover", pt: ["ice"], years: "2023", in: RU, color: "silver", segment: "Городской кроссовер" }),
  kaiyi("e5", "E5", { body: "sedan", pt: ["ice"], years: "2023", in: RU, color: "white", segment: "Компактный седан" }),

  // Dongfeng
  dongfeng("shine-max", "Shine Max", { zh: "奕炫MAX", aka: ["Yixuan Max"], body: "sedan", pt: ["ice"], years: "2021", in: KZ_RU, color: "blue", segment: "Компактный седан" }),

  // FAW Bestune
  bestune("t77", "T77", { body: "crossover", pt: ["ice"], years: "2018", in: KZ_RU, color: "red", segment: "Компактный кроссовер" }),
];
