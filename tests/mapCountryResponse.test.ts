import { describe, expect, it } from "vitest";
import { mapCountryResponse } from "../src/mapCountryResponse.js";

describe("mapCountryResponse", () => {
  it("extracts card and detail data from a country", () => {
    const raw = {
      name: "Spain",
      nativeName: "España",
      capital: "Madrid",
      region: "Europe",
      subregion: "Southern Europe",
      population: 47351567,
      area: 505992,
      flag: "🇪🇸",
      flags: { svg: "https://flagcdn.com/es.svg" },
      borders: ["FRA", "PRT"],
      languages: [{ name: "Spanish", nativeName: "Español" }],
      currencies: [{ code: "EUR", name: "Euro", symbol: "€" }],
    };
    const original = structuredClone(raw);

    expect(mapCountryResponse(raw)).toEqual({
      name: "Spain",
      nativeName: "España",
      capital: "Madrid",
      region: "Europe",
      subregion: "Southern Europe",
      population: 47351567,
      area: 505992,
      flag: "🇪🇸",
      flagUrl: "https://flagcdn.com/es.svg",
      borders: ["FRA", "PRT"],
      languages: ["Spanish"],
      currencies: ["Euro"],
    });
    expect(raw).toEqual(original);
  });

  it("preserves zero population and fills in missing optional fields", () => {
    expect(
      mapCountryResponse({
        name: "Antarctica",
        population: 0,
        capital: "",
        languages: null,
        flags: { png: "https://flagcdn.com/w320/aq.png" },
      }),
    ).toEqual({
      name: "Antarctica",
      nativeName: null,
      capital: null,
      region: null,
      subregion: null,
      population: 0,
      area: null,
      flag: null,
      flagUrl: "https://flagcdn.com/w320/aq.png",
      borders: [],
      languages: [],
      currencies: [],
    });
  });

  it("accepts a flag URL and skips incomplete entries in lists", () => {
    expect(
      mapCountryResponse({
        name: "Canada",
        flag: "https://countries.dev/flags/ca.svg",
        borders: ["USA", null],
        languages: [null, { name: "English" }, { name: "French" }],
        currencies: [{ code: "CAD" }, { name: "Canadian dollar" }],
      }),
    ).toMatchObject({
      flag: null,
      flagUrl: "https://countries.dev/flags/ca.svg",
      borders: ["USA"],
      languages: ["English", "French"],
      currencies: ["Canadian dollar"],
    });
  });

  it.each([null, {}, { name: " " }])(
    "rejects a country without a usable name (%j)",
    (raw) => {
      expect(() => mapCountryResponse(raw)).toThrow("Expected a country name");
    },
  );
});
