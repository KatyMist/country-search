export class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`Country search failed with HTTP status ${status}`);
    this.name = "HttpError";
  }
}

export async function searchCountries(
  query: string,
  signal: AbortSignal,
): Promise<unknown[]> {
  const url = `https://countries.dev/name/${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal });

  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const countries: unknown = await response.json();
  if (!Array.isArray(countries)) {
    throw new TypeError("Expected an array of countries");
  }
  return countries;
}
