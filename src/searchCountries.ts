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
  void query;
  void signal;
  throw new Error("Country search is not implemented");
}
