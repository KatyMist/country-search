export interface Country {
  name: string;
  nativeName: string | null;
  capital: string | null;
  region: string | null;
  subregion: string | null;
  population: number | null;
  area: number | null;
  flag: string | null;
  flagUrl: string | null;
  borders: string[];
  languages: string[];
  currencies: string[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readList(
  value: unknown,
  readItem: (item: unknown) => string | null,
): string[] {
  if (!Array.isArray(value)) return [];

  return value.map(readItem).filter((item) => item !== null);
}

function readName(value: unknown): string | null {
  return readText(asRecord(value)?.name);
}

export function mapCountryResponse(raw: unknown): Country {
  const country = asRecord(raw);
  const name = readText(country?.name);
  if (!country || !name) {
    throw new TypeError("Expected a country name");
  }

  const flag = readText(country.flag);
  const flagIsUrl = flag !== null && /^https?:\/\//i.test(flag);
  const flags = asRecord(country.flags);

  return {
    name,
    nativeName: readText(country.nativeName),
    capital: readText(country.capital),
    region: readText(country.region),
    subregion: readText(country.subregion),
    population: readNumber(country.population),
    area: readNumber(country.area),
    flag: flagIsUrl ? null : flag,
    flagUrl:
      readText(flags?.svg) ?? readText(flags?.png) ?? (flagIsUrl ? flag : null),
    borders: readList(country.borders, readText),
    languages: readList(country.languages, readName),
    currencies: readList(country.currencies, readName),
  };
}
