import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "../src/debounce.js";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the callback only after the delay has elapsed", () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 300);

    debounced();
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("resets the delay and forwards only the latest arguments", () => {
    const callback = vi.fn<(query: string, limit: number) => void>();
    const debounced = debounce(callback, 300);

    debounced("sp", 5);
    vi.advanceTimersByTime(200);
    debounced("spain", 10);
    vi.advanceTimersByTime(299);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith("spain", 10);
  });

  it("can schedule another call after the previous one fires", () => {
    const callback = vi.fn<(query: string) => void>();
    const debounced = debounce(callback, 300);

    debounced("spain");
    vi.advanceTimersByTime(300);
    debounced("france");
    vi.advanceTimersByTime(300);

    expect(callback.mock.calls).toEqual([["spain"], ["france"]]);
  });
});
