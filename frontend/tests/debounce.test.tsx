import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "@/lib/use-debounced-value";

describe("useDebouncedValue", () => {
  it("does not publish each keystroke and emits the final query after the delay", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "" } },
    );
    rerender({ value: "m" });
    rerender({ value: "ma" });
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe("ma");
    vi.useRealTimers();
  });
});
