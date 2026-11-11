import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpError, searchCountries } from "../src/searchCountries.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchCountries", () => {
  it("encodes the query, forwards the signal, and returns the countries", async () => {
    const countries = [{ name: "Côte d’Ivoire", capital: "Yamoussoukro" }];
    const { signal } = new AbortController();
    fetchMock.mockResolvedValue(Response.json(countries));

    await expect(searchCountries("Côte d’Ivoire", signal)).resolves.toEqual(
      countries,
    );
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://countries.dev/name/C%C3%B4te%20d%E2%80%99Ivoire",
      { signal },
    );
  });

  it("returns an empty array for HTTP 404", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(
      searchCountries("unknown", new AbortController().signal),
    ).resolves.toEqual([]);
  });

  it.each([429, 500])(
    "throws HttpError with HTTP status %i",
    async (status) => {
      fetchMock.mockResolvedValue(new Response(null, { status }));

      const result = searchCountries("spain", new AbortController().signal);

      await expect(result).rejects.toBeInstanceOf(HttpError);
      await expect(result).rejects.toHaveProperty("status", status);
    },
  );

  it("propagates a failed fetch", async () => {
    const error = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(error);

    await expect(
      searchCountries("spain", new AbortController().signal),
    ).rejects.toBe(error);
  });

  it("rejects a successful response with a non-array body", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "Unexpected body" }));

    await expect(
      searchCountries("spain", new AbortController().signal),
    ).rejects.toThrow("Expected an array of countries");
  });
});
