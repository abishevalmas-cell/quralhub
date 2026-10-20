import { createHash } from "node:crypto";
import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { FIXTURE_VINS } from "@/lib/providers/fixture";
import {
  ENDPOINT_17VIN,
  SeventeenVinProvider,
  fetch17,
  image17,
  normalizeCategories,
  normalizeDecode,
  normalizeOeSearch,
  normalizeParts,
  path17,
  providerCodeMeta,
  sign17,
  type FetchLike,
} from "@/lib/providers/seventeen-vin";

const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
const VIN = FIXTURE_VINS.bydSongPlus;

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...init.headers } });

function recorder(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch: FetchLike = async (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  };
  return { calls, fetch };
}

const provider = (fetch: FetchLike, extra: { timeoutMs?: number; maxBytes?: number } = {}) =>
  new SeventeenVinProvider({ user: "fixture-user", password: "fixture-pass", fetch, ...extra });

// A body that never finishes: used to prove the deadline also covers reading.
const stalledBody = () =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"code":1,'));
    },
  });

describe("17VIN signing", () => {
  it("matches the old signed17 algorithm", () => {
    const path = `/?vin=${VIN}`;
    const token = md5(md5("myusername") + md5("mypassword") + path);
    expect(sign17(path, "myusername", "mypassword")).toBe(`https://api.17vin.com:8443${path}&user=myusername&token=${token}`);
  });

  it("matches a fixed vector computed outside this code base", () => {
    // printf '%s' "$(md5 myusername)$(md5 mypassword)/?vin=LGXTXSP24PATX0001" | md5sum
    expect(sign17("/?vin=LGXTXSP24PATX0001", "myusername", "mypassword")).toBe(
      "https://api.17vin.com:8443/?vin=LGXTXSP24PATX0001&user=myusername&token=a20846f06e7b4b87a0761d13a7e58f27",
    );
  });

  it("signs the raw user and password but URL-encodes the user", () => {
    const path = path17("byd", [
      ["action", "cata1"],
      ["vin", VIN],
    ]);
    const url = sign17(path, "user@tetix kz", "pa&ss");
    expect(url).toBe(ENDPOINT_17VIN + path + "&user=user%40tetix%20kz&token=" + md5(md5("user@tetix kz") + md5("pa&ss") + path));
    expect(url).not.toContain("pa&ss");
  });

  it("builds paths like the old path17", () => {
    expect(path17("", [["vin", VIN]])).toBe(`/?vin=${VIN}`);
    expect(path17("byd", [["last_cata_code", "A B/C"]])).toBe("/byd?last_cata_code=A%20B%2FC");
  });
});

describe("17VIN request paths", () => {
  it("uses the documented browsing, decode and OE paths with a signed query", async () => {
    const { calls, fetch } = recorder(() => json({ code: 0 }));
    const p = provider(fetch);
    await p.decodeVin(VIN.toLowerCase());
    await p.categories({ vin: VIN, epc: "byd", level: 1 });
    await p.categories({ vin: VIN, epc: "byd", level: 2, parentCode: "06" });
    await p.categories({ vin: VIN, epc: "byd", level: 3, parentCode: "06-01" });
    await p.parts({ vin: VIN, epc: "byd", categoryCode: "SA3HJ-06002", level: 3 });
    await p.searchOe("14905517-00");
    const paths = calls.map((c) => c.url.slice(ENDPOINT_17VIN.length, c.url.indexOf("&user=")));
    expect(paths).toEqual([
      `/?vin=${VIN}`,
      `/byd?action=cata1&vin=${VIN}`,
      `/byd?action=cata2&vin=${VIN}&cata1_code=06`,
      `/byd?action=cata3&vin=${VIN}&cata2_code=06-01`,
      `/byd?action=part&vin=${VIN}&last_cata_code=SA3HJ-06002&last_cata_code_level=3`,
      "/?action=search_epc&query_part_number=14905517-00&query_match_type=exact",
    ]);
    calls.forEach((c, i) => {
      expect(c.url).toBe(sign17(paths[i], "fixture-user", "fixture-pass"));
      expect(c.init.redirect).toBe("error");
      expect(c.init.cache).toBe("no-store");
      expect(c.init.headers).toEqual({ accept: "application/json" });
      expect(c.init.signal).toBeInstanceOf(AbortSignal);
      expect(c.url).toMatch(/&user=fixture-user&token=[0-9a-f]{32}$/);
    });
  });

  it("sends OE numbers in one uppercase spelling", async () => {
    const { calls, fetch } = recorder(() => json({ code: 1, data: [] }));
    await provider(fetch).searchOe("  c385b120301-0100 ");
    expect(calls[0].url).toContain("query_part_number=C385B120301-0100&");
  });

  it("rejects bad input before any paid call", async () => {
    const { calls, fetch } = recorder(() => json({ code: 1, data: {} }));
    const p = provider(fetch);
    expect((await p.decodeVin("LGX123")).status).toBe("invalid");
    expect((await p.decodeVin(VIN.slice(0, 16) + "O")).status).toBe("invalid");
    expect((await p.categories({ vin: VIN, epc: "byd", level: 2 })).status).toBe("invalid");
    expect((await p.categories({ vin: VIN, epc: "../byd", level: 1 })).status).toBe("invalid");
    expect((await p.parts({ vin: VIN, epc: "byd", categoryCode: " ", level: 3 })).status).toBe("invalid");
    expect((await p.searchOe("")).status).toBe("invalid");
    expect((await p.searchOe("<script>")).status).toBe("invalid");
    // A lone surrogate would make encodeURIComponent throw inside the request builder.
    expect((await p.parts({ vin: VIN, epc: "byd", categoryCode: "SA3HJ\uD800", level: 3 })).status).toBe("invalid");
    expect((await p.categories({ vin: VIN, epc: "byd", level: 2, parentCode: "0\u00006" })).status).toBe("invalid");
    expect(calls).toHaveLength(0);
  });

  it("reports not_configured without credentials and never calls out", async () => {
    const { calls, fetch } = recorder(() => json({ code: 1 }));
    const p = new SeventeenVinProvider({ user: "", password: "", fetch });
    const result = await p.decodeVin(VIN);
    expect(result).toMatchObject({ status: "not_configured", source: "provider", candidates: [], ambiguous: false });
    expect(calls).toHaveLength(0);
  });

  it("keeps the VIN-direct 5101–5105 extension point inert", async () => {
    const { calls, fetch } = recorder(() => json({ code: 1 }));
    const result = await provider(fetch).vinDirect(5101, { vin: VIN });
    expect(result).toMatchObject({ status: "not_configured", categories: [], parts: [] });
    expect(calls).toHaveLength(0);
  });

  it("does not expose credentials when serialized or logged", () => {
    const p = provider(async () => json({}));
    for (const shown of [JSON.stringify(p), inspect(p, { depth: 5, showHidden: true }), String(p)]) {
      expect(shown).not.toContain("fixture-pass");
      expect(shown).not.toContain("fixture-user");
    }
  });
});

describe("image sanitizer", () => {
  it("builds images.17vin.com URLs", () => {
    expect(image17("SA3H-06002.png", "diagram", "byd")).toBe("https://images.17vin.com/img/byd/SA3H-06002.png");
    expect(image17("090562C.png", "diagram", "toyota")).toBe("https://images.17vin.com/img/toyota/090562C.png");
    expect(image17("026\\photo.jpg", "vehicle")).toBe("https://images.17vin.com/img/car/all/026/photo.jpg");
    expect(image17("/parts/a b.jpg", "part")).toBe("https://images.17vin.com/parts/a%20b.jpg");
    expect(image17("first.png,second.png", "diagram", "byd")).toBe("https://images.17vin.com/img/byd/first.png");
    expect(image17("https://resource.17vin.com/img/byd/x.png", "diagram", "byd")).toBe("https://images.17vin.com/img/byd/x.png");
    expect(image17("http://images.17vin.com/img/car/all/1.jpg", "vehicle")).toBe("https://images.17vin.com/img/car/all/1.jpg");
  });

  it("rejects foreign hosts and unsafe values", () => {
    for (const value of [
      "https://evil.test/p.jpg",
      "https://images.17vin.com.evil.test/p.jpg",
      "https://user:pass@images.17vin.com/p.jpg",
      "https://images.17vin.com:8080/p.jpg",
      "//evil.test/p.jpg",
      "../private",
      "img/../../etc",
      "a.png?x=1",
      "a.png#top",
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "",
      null,
      { url: "x.png" },
    ])
      expect(image17(value, "part")).toBeNull();
    expect(image17("x.png", "diagram", "../etc")).toBeNull();
    expect(image17("x.png", "diagram")).toBeNull();
    expect(image17("https://images.17vin.com/", "part")).toBeNull();
  });

  it("repairs text that encodeURIComponent would throw on", () => {
    expect(() => image17("car\uD800.jpg", "vehicle")).not.toThrow();
    expect(image17("car\uD800.jpg", "vehicle")).toBe("https://images.17vin.com/img/car/all/car%EF%BF%BD.jpg");
    expect(image17("x\u0000.png", "diagram", "byd")).toBe("https://images.17vin.com/img/byd/x%20.png");
  });
});

describe("normalizer", () => {
  it("maps provider codes", () => {
    const table: [number, string][] = [
      [0, "empty"],
      [1001, "invalid"],
      [1002, "auth"],
      [1003, "unsupported"],
      [1004, "auth"],
      [1005, "quota_or_expired"],
      [1006, "provider_error"],
      [1007, "unsupported"],
      [4242, "provider_error"],
    ];
    for (const [code, status] of table) {
      expect(normalizeDecode({ code })).toMatchObject({ status, providerCode: code, candidates: [], ambiguous: false });
      expect(normalizeCategories({ code }, "byd")).toMatchObject({ status, providerCode: code, categories: [] });
      expect(normalizeParts({ code }, "byd")).toMatchObject({ status, providerCode: code, parts: [] });
      expect(providerCodeMeta(code).status).toBe(status);
    }
    expect(normalizeOeSearch({ code: "1005" }).status).toBe("quota_or_expired");
  });

  it("rejects codes that do not fit the journal column", () => {
    expect(normalizeDecode({ code: 3_000_000_000 }).status).toBe("malformed");
    expect(normalizeDecode({ code: "99999999999" }).status).toBe("malformed");
    expect(normalizeDecode({ code: "1005" })).toMatchObject({ status: "quota_or_expired", providerCode: 1005 });
  });

  it("flags malformed envelopes and payloads", () => {
    for (const raw of [null, [], "ok", { code: "x" }, { code: 1.5 }, {}]) expect(normalizeDecode(raw).status).toBe("malformed");
    expect(normalizeDecode({ code: 1, data: {} }).status).toBe("malformed");
    expect(normalizeDecode({ code: 1, data: { model_list: new Array(501).fill({}) } }).status).toBe("malformed");
    expect(normalizeCategories({ code: 1, data: { catalist: [{ cata_code: "x", cata_level: 9 }] } }, "byd").status).toBe("malformed");
    expect(normalizeCategories({ code: 1, data: { catalist: [{ cata_level: 1 }] } }, "byd").status).toBe("malformed");
    expect(normalizeParts({ code: 1, data: { partlist: "nope" } }, "byd").status).toBe("malformed");
    expect(normalizeOeSearch({ code: 1, data: { list: [] } }).status).toBe("malformed");
  });

  it("decodes several trims as ambiguous, without picking one", () => {
    const result = normalizeDecode({
      code: 1,
      data: {
        epc: "byd",
        epc_id: "9001",
        matching_mode: "exact_match",
        build_date: "202303",
        made_in_en: "China",
        model_list: [
          {
            Js_id: "101",
            Brand_en: "BYD",
            Model_en: "Song Plus DM-i",
            Model_year: 2023,
            Sales_version_en: "Flagship PLUS",
            Model_detial_en: "BYD Song Plus DM-i Flagship PLUS 2023",
            Engine_no_en: "BYD472QA",
            Fule_type_en: "PHEV",
            Driving_mode_en: "Front-engine FWD",
            Epc_id: "9001",
            Img_adress: "D54/car.jpg",
          },
          { Js_id: "101", Brand_en: "BYD", Model_en: "Song Plus DM-i", Sales_version_en: "Flagship PLUS 5G" },
          { Brand: "BYD", Model: "Song Plus DM-i" },
        ],
      },
    });
    expect(result).toMatchObject({
      status: "success",
      providerCode: 1,
      source: "provider",
      epc: "byd",
      epcId: "9001",
      buildDate: "202303",
      manufacturedIn: "China",
      ambiguous: true,
    });
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates[0]).toEqual({
      id: "101",
      brand: "BYD",
      model: "Song Plus DM-i",
      year: "2023",
      version: "Flagship PLUS",
      description: "BYD Song Plus DM-i Flagship PLUS 2023",
      engine: "BYD472QA",
      fuel: "PHEV",
      drive: "Front-engine FWD",
      epcId: "9001",
      image: "https://images.17vin.com/img/car/all/D54/car.jpg",
    });
    // Ids stay unique so a trim can be chosen explicitly.
    expect(new Set(result.candidates.map((c) => c.id)).size).toBe(3);
    expect(result.candidates[2].id).toBe("candidate-3");
    expect(normalizeDecode({ code: 1, data: { epc: "byd", model_list: [] } }).status).toBe("empty");
    expect(normalizeDecode({ code: 1, data: { epc: "../x", model_list: [{ Brand: "BYD" }] } }).epc).toBeUndefined();
    // An over-long EPC is dropped, not cut down to something that looks valid.
    expect(normalizeDecode({ code: 1, data: { epc: "b".repeat(61), model_list: [{ Brand: "BYD" }] } }).epc).toBeUndefined();
  });

  it("keeps candidate ids unique even when renamed ids collide", () => {
    const ids = (list: unknown[]) => normalizeDecode({ code: 1, data: { model_list: list } }).candidates.map((c) => c.id);
    const tricky = ids([{ Js_id: "5-3" }, { Js_id: "5" }, { Js_id: "5" }]);
    expect(new Set(tricky).size).toBe(3);
    expect(tricky.slice(0, 2)).toEqual(["5-3", "5"]);
    const fallback = ids([{ Js_id: "candidate-2" }, {}]);
    expect(new Set(fallback).size).toBe(2);
  });

  it("normalizes category lists", () => {
    const result = normalizeCategories(
      {
        code: 1,
        data: {
          catalist: [
            { cata_code: "06", cata_level: "1", is_last: 0, name_en: "06 Body and Body Accessories", is_fit_for_this_vin: 1 },
            { cata_code: "SA3HJ-06002", cata_level: 3, is_last: "1", name_zh: "车身主体", illustration_img_address: "SA3H-06002.png" },
          ],
        },
      },
      "byd",
    );
    expect(result.status).toBe("success");
    expect(result.categories).toEqual([
      { code: "06", level: 1, last: false, name: "06 Body and Body Accessories", remark: "", diagram: null, providerFit: true },
      {
        code: "SA3HJ-06002",
        level: 3,
        last: true,
        name: "车身主体",
        remark: "",
        diagram: "https://images.17vin.com/img/byd/SA3H-06002.png",
        providerFit: null,
      },
    ]);
    expect(normalizeCategories({ code: 1, data: { catalist: [] } }, "byd").status).toBe("empty");
    // Numeric codes are accepted as text.
    expect(normalizeCategories({ code: 1, data: { catalist: [{ cata_code: 1110, cata_level: 2 }] } }, "geely").categories[0].code).toBe(
      "1110",
    );
  });

  it("refuses category codes it could not send back unchanged", () => {
    for (const cata_code of ["x".repeat(161), "06\u0000", "06\uD800"]) {
      expect(normalizeCategories({ code: 1, data: { catalist: [{ cata_code, cata_level: 1 }] } }, "byd").status).toBe("malformed");
    }
  });

  it("cleans text that Postgres jsonb would refuse to cache", () => {
    const result = normalizeParts(
      {
        code: 1,
        data: {
          partlist: [
            { partnumber_original: "10301727-00", name_en: "Oil\u0000filter", remark_en: "a".repeat(999) + "😀", Part_img: "p\uDC00.jpg" },
          ],
        },
      },
      "byd",
    );
    expect(result.status).toBe("success");
    const [part] = result.parts;
    expect(part.name).toBe("Oil filter");
    // The 1000-character cap must not cut the emoji in half.
    expect(part.remark).toBe("a".repeat(999));
    for (const value of Object.values(part)) {
      if (typeof value !== "string") continue;
      expect(value.isWellFormed()).toBe(true);
      expect(value).not.toMatch(/[\u0000-\u001f]/);
    }
    // JSON.stringify escapes only lone surrogates and control characters, which jsonb rejects.
    expect(JSON.stringify(result)).not.toMatch(/\\u(00[01][0-9a-f]|d[89a-f][0-9a-f]{2})/i);
  });

  it("normalizes parts without any price and marks them for review", () => {
    const result = normalizeParts(
      {
        code: 1,
        data: {
          imgaddress: "SA3H-06002.png",
          partlist: [
            {
              partnumber_original: "14905517-00",
              partnumber: "1490551700",
              name_en: "Body main assembly",
              name_zh: "车身主体总成",
              engineer_partnumber: "SA3HK-5010010/TX",
              callout: 1,
              qty: "1",
              remark_zh: "物料编码:SA3HK-5010010/TX",
              model_optional: "5G",
              is_fit_for_this_vin: 1,
              Price: "23.5",
            },
            { partnumber: "TEST-ONLY", Part_img: "https://evil.test/p.jpg", is_fit_for_this_vin: "0" },
          ],
        },
      },
      "byd",
    );
    expect(result.status).toBe("success");
    expect(result.parts[0]).toEqual({
      oe: "14905517-00",
      normalizedOe: "1490551700",
      name: "Body main assembly",
      nameZh: "车身主体总成",
      engineerPartNumber: "SA3HK-5010010/TX",
      modelOptional: "5G",
      modelNotOptional: "",
      callout: "1",
      quantity: "1",
      remark: "物料编码:SA3HK-5010010/TX",
      replacement: "",
      beginDate: "",
      endDate: "",
      diagram: "https://images.17vin.com/img/byd/SA3H-06002.png",
      image: null,
      providerFit: true,
      compatibility: "requires_review",
    });
    expect(result.parts[1]).toMatchObject({ oe: "TEST-ONLY", name: "Название не предоставлено", image: null, providerFit: false });
    expect(JSON.stringify(result)).not.toMatch(/price|currency/i);
  });

  it("drops catalog rows without an OE number", () => {
    const result = normalizeParts(
      { code: 1, data: { partlist: [{ name_en: "See group 06-02" }, { partnumber: " - " }, { partnumber_original: "10185533-00" }] } },
      "byd",
    );
    expect(result.parts.map((x) => x.oe)).toEqual(["10185533-00"]);
    expect(normalizeParts({ code: 1, data: { partlist: [{ name_en: "Note only" }] } }, "byd")).toMatchObject({ status: "empty", parts: [] });
  });

  it("normalizes OE search answers", () => {
    const result = normalizeOeSearch({ code: 1, data: [{ Partnumber: "1490551700" }] });
    expect(result.status).toBe("success");
    expect(result.parts[0]).toMatchObject({ oe: "1490551700", normalizedOe: "1490551700", diagram: null });
    expect(normalizeOeSearch({ code: 1, data: [] }).status).toBe("empty");
  });
});

describe("17VIN transport", () => {
  it("times out when the server does not answer", async () => {
    const { calls, fetch } = recorder(() => new Promise<Response>(() => undefined));
    const result = await provider(fetch, { timeoutMs: 30 }).decodeVin(VIN);
    expect(result.status).toBe("timeout");
    expect(calls).toHaveLength(1);
    expect((calls[0].init.signal as AbortSignal).aborted).toBe(true);
  });

  it("times out when a fetch honours the abort signal", async () => {
    const fetch: FetchLike = (_url, init) =>
      new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    expect((await provider(fetch, { timeoutMs: 30 }).decodeVin(VIN)).status).toBe("timeout");
  });

  it("times out while the body is still streaming and releases the stream", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"code":1,'));
      },
      cancel() {
        cancelled = true;
      },
    });
    // This fetcher ignores the abort signal, so only the adapter itself can close the stream.
    const fetch: FetchLike = async () => new Response(body);
    expect((await provider(fetch, { timeoutMs: 50 }).decodeVin(VIN)).status).toBe("timeout");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(cancelled).toBe(true);
    expect((await provider(async () => new Response(stalledBody()), { timeoutMs: 50 }).decodeVin(VIN)).status).toBe("timeout");
  });

  it("caps the streamed response at 2 MB", async () => {
    expect((await provider(async () => new Response("x".repeat(2_000_001))).decodeVin(VIN)).status).toBe("malformed");
    const chunk = new Uint8Array(700_000).fill(32);
    let pulled = 0;
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(chunk);
      },
    });
    const result = await provider(async () => new Response(endless)).decodeVin(VIN);
    expect(result.status).toBe("malformed");
    expect(result.message).toContain("2 МБ");
    expect(pulled).toBeLessThan(10);
  });

  it("refuses a declared oversize body without reading it", async () => {
    const body = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error("must not be read");
      },
    });
    const response = new Response(body, { headers: { "content-length": "5000000" } });
    const transport = await fetch17("https://api.17vin.com:8443/?vin=X", async () => response, 1000, 2_000_000);
    expect(transport).toMatchObject({ ok: false, meta: { status: "malformed" } });
  });

  it("maps HTTP errors and never retries", async () => {
    const cases: [number, string][] = [
      [429, "rate_limit"],
      [401, "auth"],
      [403, "auth"],
      [404, "provider_error"],
      [500, "provider_error"],
      [502, "network"],
      [503, "network"],
      [504, "network"],
    ];
    for (const [status, expected] of cases) {
      const { calls, fetch } = recorder(() => json({ code: 1 }, { status }));
      const result = await provider(fetch).categories({ vin: VIN, epc: "byd", level: 1 });
      expect(result.status).toBe(expected);
      expect(result.message).toContain(String(status));
      expect(calls).toHaveLength(1);
    }
  });

  it("hides transport error details that may contain the token", async () => {
    const { calls, fetch } = recorder(() => {
      throw new Error("connect failed: https://api.17vin.com:8443/?vin=X&token=secret-token");
    });
    const result = await provider(fetch).decodeVin(VIN);
    expect(result.status).toBe("network");
    expect(result.message).not.toContain("secret-token");
    expect(calls).toHaveLength(1);
    expect((await provider(async () => Promise.reject(new TypeError("redirect mode is set to error"))).decodeVin(VIN)).status).toBe(
      "network",
    );
  });

  it("reports bad JSON and accepts a byte order mark", async () => {
    expect((await provider(async () => new Response("bad-json")).decodeVin(VIN)).status).toBe("malformed");
    expect((await provider(async () => new Response("")).decodeVin(VIN)).status).toBe("malformed");
    const withBom = "\uFEFF" + JSON.stringify({ code: 1, data: { epc: "byd", model_list: [{ Js_id: "1", Brand_en: "BYD" }] } });
    const result = await provider(async () => new Response(withBom)).decodeVin(VIN);
    expect(result).toMatchObject({ status: "success", epc: "byd", ambiguous: false });
  });

  it("parses a full parts answer end to end", async () => {
    const fetch: FetchLike = async () =>
      json({ code: 1, data: { imgaddress: "g.png", partlist: [{ partnumber_original: "10273368-00", name_en: "Front brake pad kit" }] } });
    const result = await provider(fetch).parts({ vin: VIN, epc: "byd", categoryCode: "SA3HJ-03041", level: 3 });
    expect(result).toMatchObject({ status: "success", source: "provider", providerCode: 1 });
    expect(result.parts[0]).toMatchObject({ oe: "10273368-00", diagram: "https://images.17vin.com/img/byd/g.png" });
  });
});

describe("17VIN level 4 catalogs", () => {
  it("reads the fourth level with cata4 and cata3_code and parts with last_cata_code_level=4", async () => {
    const { calls, fetch } = recorder(() => json({ code: 0 }));
    const p = provider(fetch);
    await p.categories({ vin: VIN, epc: "byd", level: 4, parentCode: "SA3HJ-10035" });
    await p.parts({ vin: VIN, epc: "byd", categoryCode: "SA3HJ-10035-1", level: 4 });
    const paths = calls.map((c) => c.url.slice(ENDPOINT_17VIN.length, c.url.indexOf("&user=")));
    expect(paths).toEqual([
      `/byd?action=cata4&vin=${VIN}&cata3_code=SA3HJ-10035`,
      `/byd?action=part&vin=${VIN}&last_cata_code=SA3HJ-10035-1&last_cata_code_level=4`,
    ]);
  });

  it("refuses level 4 without a parent and any level above 4, before calling out", async () => {
    const { calls, fetch } = recorder(() => json({ code: 1, data: {} }));
    const p = provider(fetch);
    expect((await p.categories({ vin: VIN, epc: "byd", level: 4 })).status).toBe("invalid");
    const five = { vin: VIN, epc: "byd", level: 5, parentCode: "X" } as unknown as Parameters<typeof p.categories>[0];
    expect((await p.categories(five)).status).toBe("invalid");
    const parts5 = { vin: VIN, epc: "byd", level: 5, categoryCode: "X" } as unknown as Parameters<typeof p.parts>[0];
    expect((await p.parts(parts5)).status).toBe("invalid");
    expect(calls).toHaveLength(0);
  });

  it("accepts level 4 groups in category answers and rejects level 5", () => {
    const four = normalizeCategories({ code: 1, data: { catalist: [{ cata_code: "SA3HJ-10035-1", cata_level: "4", is_last: 1 }] } }, "byd");
    expect(four).toMatchObject({ status: "success", categories: [{ code: "SA3HJ-10035-1", level: 4, last: true }] });
    expect(normalizeCategories({ code: 1, data: { catalist: [{ cata_code: "X", cata_level: 5 }] } }, "byd").status).toBe("malformed");
  });
});

describe("17VIN code 1006", () => {
  it("reads 1006 with msg 'query no result' as an empty answer", () => {
    const raw = { code: 1006, msg: "query no result", data: null };
    expect(normalizeParts(raw, "byd")).toMatchObject({ status: "empty", providerCode: 1006, parts: [], providerMessage: "query no result" });
    expect(normalizeOeSearch({ code: "1006", msg: " Query No Result " })).toMatchObject({ status: "empty", providerCode: 1006 });
    expect(normalizeCategories(raw, "byd").status).toBe("empty");
    expect(normalizeDecode(raw).status).toBe("empty");
    expect(providerCodeMeta(1006, "query no result").status).toBe("empty");
  });

  it("keeps any other 1006 as a provider error", () => {
    expect(normalizeParts({ code: 1006, msg: "Internal server error" }, "byd")).toMatchObject({
      status: "provider_error",
      providerCode: 1006,
      providerMessage: "Internal server error",
    });
    expect(normalizeParts({ code: 1006 }, "byd").status).toBe("provider_error");
    expect(providerCodeMeta(1006).status).toBe("provider_error");
  });
});

describe("17VIN providerMessage", () => {
  it("keeps the raw msg on success and on errors", () => {
    const ok = normalizeDecode({ code: 1, msg: "success", data: { epc: "byd", model_list: [{ Js_id: "1", Brand_en: "BYD" }] } });
    expect(ok).toMatchObject({ status: "success", providerMessage: "success" });
    expect(normalizeCategories({ code: 1003, msg: "Unsupported brand" }, "zeekr")).toMatchObject({
      status: "unsupported",
      providerMessage: "Unsupported brand",
    });
    expect(normalizeCategories({ code: 1, msg: "ok", data: { catalist: [] } }, "byd")).toMatchObject({ status: "empty", providerMessage: "ok" });
    expect(normalizeParts({ code: 1, msg: "ok", data: {} }, "byd")).toMatchObject({ status: "malformed", providerMessage: "ok" });
    expect(normalizeOeSearch({ code: 1, msg: "ok", data: [{ Partnumber: "10301727-00" }] }).providerMessage).toBe("ok");
  });

  it("omits providerMessage when there is no text msg", () => {
    expect("providerMessage" in normalizeDecode({ code: 0 })).toBe(false);
    expect("providerMessage" in normalizeParts({ code: 0, msg: "   " }, "byd")).toBe(false);
    expect("providerMessage" in normalizeParts({ code: 0, msg: { text: "x" } }, "byd")).toBe(false);
  });

  it("masks VINs and long tokens, strips control characters and caps the length", () => {
    const glued = `vin:${VIN} VIN码${VIN.toLowerCase()}不存在 ref=${VIN}EXTRA token=0123456789abcdef0123456789abcdef`;
    const message = normalizeDecode({ code: 0, msg: glued }).providerMessage!;
    expect(message).not.toMatch(/TXSP2/i);
    expect(message).not.toContain("0123456789abcdef");
    expect(message).toContain("LGX…0001");
    expect(message).toContain("不存在");
    const noisy = normalizeDecode({ code: 0, msg: "line1\n\u0000line2\uD800" }).providerMessage!;
    expect(noisy).not.toMatch(/[\u0000-\u001f]/);
    expect(noisy.isWellFormed()).toBe(true);
    const long = normalizeDecode({ code: 0, msg: "数据".repeat(400) + VIN }).providerMessage!;
    expect(long.length).toBeLessThanOrEqual(300);
    // A VIN far beyond the cap can neither leak nor be cut into a readable fragment.
    const tail = normalizeDecode({ code: 0, msg: "x ".repeat(2100) + VIN }).providerMessage!;
    expect(tail).not.toContain("TXSP2");
  });

  it("passes the masked msg through a full request", async () => {
    const result = await provider(async () => json({ code: 1003, msg: `Unsupported brand for ${VIN}` })).categories({
      vin: VIN,
      epc: "zeekr",
      level: 1,
    });
    expect(result).toMatchObject({ status: "unsupported", providerMessage: "Unsupported brand for LGX…0001" });
  });
});
