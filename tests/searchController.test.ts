import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSearchController } from "../src/searchController.js";

const fetchMock = vi.fn<typeof fetch>();
const delay = 300;
const timeout = 5_000;

function setup() {
  const onState = vi.fn();
  const controller = createSearchController({ onState, delay, timeout });
  return { ...controller, onState };
}

function pendingUntilAborted(_input: unknown, init?: RequestInit) {
  const signal = init?.signal;
  return new Promise<Response>((_resolve, reject) => {
    signal?.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createSearchController", () => {
  it("debounces input and publishes loading and mapped results", async () => {
    const { setQuery, onState } = setup();
    fetchMock.mockResolvedValue(Response.json([{ name: "Spain" }]));

    setQuery("sp");
    setQuery("  spain  ");
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      "https://countries.dev/name/spain",
      { signal: expect.any(AbortSignal) },
    );
    expect(onState).toHaveBeenCalledWith({ status: "loading" });
    expect(onState).toHaveBeenLastCalledWith({
      status: "results",
      countries: [expect.objectContaining({ name: "Spain" })],
    });
  });

  it("aborts the active request immediately on input without publishing an error", async () => {
    const { setQuery, onState } = setup();
    fetchMock.mockImplementation(pendingUntilAborted);

    setQuery("sp");
    await vi.advanceTimersByTimeAsync(delay);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const signal = fetchMock.mock.calls[0][1]?.signal;

    setQuery("spain");
    expect(signal?.aborted).toBe(true);
    expect(signal?.reason).toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(delay - 1);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onState).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("aborts on clear, returns to idle, and sends no empty request", async () => {
    const { setQuery, onState } = setup();
    fetchMock.mockImplementation(pendingUntilAborted);

    setQuery("spain");
    await vi.advanceTimersByTimeAsync(delay);
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;

    setQuery(" ");
    await vi.advanceTimersByTimeAsync(delay);

    expect(signal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onState).toHaveBeenLastCalledWith({ status: "idle" });
  });

  it("publishes the empty state for a 404", async () => {
    const { setQuery, onState } = setup();
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    setQuery("unknown");
    await vi.advanceTimersByTimeAsync(delay);

    expect(onState).toHaveBeenLastCalledWith({ status: "empty" });
  });

  it("publishes a timeout error and aborts the request", async () => {
    const { setQuery, onState } = setup();
    fetchMock.mockImplementation(pendingUntilAborted);

    setQuery("spain");
    await vi.advanceTimersByTimeAsync(delay + timeout - 1);
    expect(onState).toHaveBeenLastCalledWith({ status: "loading" });

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock.mock.calls[0][1]?.signal?.reason).toMatchObject({
      name: "TimeoutError",
    });
    expect(onState).toHaveBeenLastCalledWith({
      status: "error",
      error: { kind: "timeout" },
    });
  });

  it("publishes the HTTP status and retries the last query immediately", async () => {
    const { setQuery, retry, onState } = setup();
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json([{ name: "Spain" }]));

    setQuery("spain");
    await vi.advanceTimersByTimeAsync(delay);
    expect(onState).toHaveBeenLastCalledWith({
      status: "error",
      error: { kind: "http", status: 503 },
    });

    retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://countries.dev/name/spain",
      "https://countries.dev/name/spain",
    ]);
    expect(onState).toHaveBeenLastCalledWith({
      status: "results",
      countries: [expect.objectContaining({ name: "Spain" })],
    });
  });

  it("publishes an error for a failed network request", async () => {
    const { setQuery, onState } = setup();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    setQuery("spain");
    await vi.advanceTimersByTimeAsync(delay);

    expect(onState).toHaveBeenLastCalledWith({
      status: "error",
      error: { kind: "request" },
    });
  });
});
