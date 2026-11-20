import { describe, expect, it } from "vitest";
import {
  buildMonthGrid,
  combineDateTime,
  dayKey,
  formatBytes,
  groupByDay,
  isSameDay,
  monthVisibleRange,
  toTimeInput,
} from "@/lib/meetings/calendar";

describe("meeting calendar helpers", () => {
  it("builds a six week grid that starts on Monday", () => {
    const days = buildMonthGrid(2026, 0);

    expect(days).toHaveLength(42);
    expect(days[0].key).toBe("2025-12-29");
    expect(days[0].date.getDay()).toBe(1);
    expect(days[3].key).toBe("2026-01-01");
    expect(days[3].inMonth).toBe(true);
    expect(days[34].inMonth).toBe(false);
    expect(days[41].key).toBe("2026-02-08");
  });

  it("covers the full grid in the visible range", () => {
    const { from, to } = monthVisibleRange(2026, 0);

    expect(dayKey(from)).toBe("2025-12-29");
    expect(dayKey(to)).toBe("2026-02-09");
    expect(to.getTime()).toBeGreaterThan(from.getTime());
  });

  it("combines a local date and time, and rejects incomplete values", () => {
    const combined = combineDateTime("2026-01-15", "09:30");

    expect(combined).not.toBeNull();
    expect(toTimeInput(combined!)).toBe("09:30");
    expect(combineDateTime("", "09:30")).toBeNull();
    expect(combineDateTime("2026-01-15", "")).toBeNull();
    expect(combineDateTime("not-a-date", "09:30")).toBeNull();
  });

  it("detects the same calendar day", () => {
    expect(
      isSameDay(
        new Date(2026, 0, 15, 8, 0),
        new Date(2026, 0, 15, 20, 30),
      ),
    ).toBe(true);
    expect(
      isSameDay(new Date(2026, 0, 15), new Date(2026, 0, 16)),
    ).toBe(false);
  });

  it("groups meetings by day and sorts each day by start time", () => {
    const earlier = new Date(2026, 0, 15, 9, 0).toISOString();
    const later = new Date(2026, 0, 15, 14, 0).toISOString();
    const nextDay = new Date(2026, 0, 16, 10, 0).toISOString();

    const grouped = groupByDay([
      { id: "later", startAt: later },
      { id: "next", startAt: nextDay },
      { id: "earlier", startAt: earlier },
    ]);

    expect(grouped.get("2026-01-15")?.map((item) => item.id)).toEqual([
      "earlier",
      "later",
    ]);
    expect(grouped.get("2026-01-16")?.map((item) => item.id)).toEqual(["next"]);
  });

  it("formats attachment sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
