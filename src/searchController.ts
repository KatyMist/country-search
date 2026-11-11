import { debounce } from "./debounce.js";
import { mapCountryResponse, type Country } from "./mapCountryResponse.js";
import { HttpError, searchCountries } from "./searchCountries.js";

type SearchError =
  { kind: "timeout" } | { kind: "http"; status: number } | { kind: "request" };

export type SearchState =
  | { status: "idle" | "waiting" | "loading" | "empty" }
  | { status: "results"; countries: Country[] }
  | { status: "error"; error: SearchError };

interface SearchControllerOptions {
  onState: (state: SearchState) => void;
  delay?: number;
  timeout?: number;
}

function classifyError(error: unknown): SearchError {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return { kind: "timeout" };
  }
  if (error instanceof HttpError) {
    return { kind: "http", status: error.status };
  }
  return { kind: "request" };
}

export function createSearchController({
  onState,
  delay = 300,
  timeout = 5_000,
}: SearchControllerOptions) {
  let active: AbortController | undefined;
  let retryQuery: string | undefined;

  async function run(query: string): Promise<void> {
    const controller = new AbortController();
    active = controller;
    retryQuery = undefined;

    const timer = setTimeout(() => {
      controller.abort(
        new DOMException("Country search timed out", "TimeoutError"),
      );
    }, timeout);

    onState({ status: "loading" });
    let state: SearchState;
    try {
      const raw = await searchCountries(query, controller.signal);
      controller.signal.throwIfAborted();
      state = raw.length
        ? { status: "results", countries: raw.map(mapCountryResponse) }
        : { status: "empty" };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      state = { status: "error", error: classifyError(error) };
    } finally {
      clearTimeout(timer);
    }

    if (active !== controller) return;
    active = undefined;
    if (state.status === "error") retryQuery = query;
    onState(state);
  }

  const schedule = debounce((query: string) => {
    if (query) void run(query);
  }, delay);

  return {
    setQuery(input: string) {
      active?.abort();
      active = undefined;
      retryQuery = undefined;
      const query = input.trim();
      schedule(query);
      onState({ status: query ? "waiting" : "idle" });
    },
    retry() {
      if (retryQuery) void run(retryQuery);
    },
  };
}
