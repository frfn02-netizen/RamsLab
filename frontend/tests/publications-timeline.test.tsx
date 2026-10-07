import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Publication } from "@/types/modules";

const { getPublications, getPublicPublicationPdfUrl } = vi.hoisted(() => ({
  getPublications: vi.fn(),
  getPublicPublicationPdfUrl: vi.fn(
    (id: string) => `https://example.test/publications/${id}.pdf`,
  ),
}));

vi.mock("@/lib/api/modules", () => ({
  getPublications,
  getPublicPublicationPdfUrl,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/publications",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import Publications from "@/components/public/publications";

const READING_RATIO = 0.34;
const VIEWPORT_HEIGHT = 800;
const READING_Y = VIEWPORT_HEIGHT * READING_RATIO;

type Layout = {
  containerTop: number;
  containerHeight: number;
  nodeOffsets: Record<string, number>;
};

let layout: Layout;
const rafCallbacks = new Map<number, FrameRequestCallback>();
let rafId = 0;

function makeRect(top: number, height: number): DOMRect {
  return {
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

function flushRaf() {
  const callbacks = Array.from(rafCallbacks.values());
  rafCallbacks.clear();
  callbacks.forEach((callback) => callback(0));
}

function makePublication(
  index: number,
  overrides: Partial<Publication> = {},
): Publication {
  return {
    _id: `pub-${index}`,
    title: `Publication ${index}`,
    authors: [`Author ${index}`],
    publicationType: "Journal Article",
    year: 2024,
    journal: `Journal ${index}`,
    doi: `10.1000/${index}`,
    pdfUrl: `https://example.test/${index}.pdf`,
    topics: ["Risk"],
    methods: ["Simulation"],
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeResponse(records: Publication[]) {
  return {
    data: records,
    total: records.length,
    page: 1,
    limit: records.length,
    facets: {
      years: Array.from(new Set(records.map((record) => record.year))),
      topics: ["Risk"],
      methods: ["Simulation"],
    },
  };
}

function timeline() {
  return screen.getByTestId("publications-timeline");
}

function progressValue() {
  return timeline().style.getPropertyValue("--timeline-progress");
}

function nodeTopValue(index: number) {
  const rows = timeline().querySelectorAll<HTMLElement>(
    "[data-publication-id]",
  );
  return rows[index]!.style.getPropertyValue("--node-top");
}

async function waitForTimeline(count: number) {
  await waitFor(() =>
    expect(screen.getAllByRole("radio")).toHaveLength(count),
  );
  await waitFor(() =>
    expect(timeline().style.getPropertyValue("--node-ramp")).toBe("48px"),
  );
}

beforeEach(() => {
  layout = { containerTop: 0, containerHeight: 1200, nodeOffsets: {} };
  rafCallbacks.clear();
  rafId = 0;

  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: VIEWPORT_HEIGHT,
  });

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      if (this.dataset.testid === "publications-timeline") {
        return makeRect(layout.containerTop, layout.containerHeight);
      }
      if (this.dataset.publicationNode) {
        const offset = layout.nodeOffsets[this.dataset.publicationNode] ?? 0;
        return makeRect(layout.containerTop + offset - 7, 14);
      }
      return makeRect(0, 0);
    },
  );

  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++rafId;
    rafCallbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCallbacks.delete(id);
  });

  getPublications.mockReset();
  getPublicPublicationPdfUrl.mockReset();
  getPublicPublicationPdfUrl.mockImplementation(
    (id: string) => `https://example.test/publications/${id}.pdf`,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("publications timeline scroll synchronization", () => {
  it("keeps a single continuous line and progress segment for a long list", async () => {
    const records = Array.from({ length: 48 }, (_, index) =>
      makePublication(index + 1),
    );
    layout.nodeOffsets = Object.fromEntries(
      records.map((record, index) => [record._id, 40 + index * 120]),
    );
    layout.containerHeight = 40 + 47 * 120 + 100;
    getPublications.mockResolvedValue(makeResponse(records));

    const { container } = render(<Publications />);
    await waitForTimeline(48);

    expect(screen.getAllByTestId("publications-timeline-line")).toHaveLength(1);
    expect(
      screen.getAllByTestId("publications-timeline-progress"),
    ).toHaveLength(1);
    expect(container.querySelectorAll("[data-publication-id]")).toHaveLength(
      48,
    );
    expect(
      screen.getAllByTestId("publication-node-active"),
    ).toHaveLength(48);

    const line = screen.getByTestId("publications-timeline-line");
    expect(line.className).toContain("top-3");
    expect(line.className).toContain("bottom-3");
    expect(line.className).not.toContain("h-screen");

    const progress = screen.getByTestId("publications-timeline-progress");
    expect(progress.className).toContain("publication-timeline-progress-line");
    expect(nodeTopValue(0)).toBe("40px");
    expect(nodeTopValue(47)).toBe(`${40 + 47 * 120}px`);
  });

  it("measures each node from actual geometry with variable card heights", async () => {
    const records = [
      makePublication(1),
      makePublication(2),
      makePublication(3),
    ];
    layout.nodeOffsets = { "pub-1": 60, "pub-2": 420, "pub-3": 980 };
    layout.containerHeight = 1400;
    getPublications.mockResolvedValue(makeResponse(records));

    render(<Publications />);
    await waitForTimeline(3);

    expect(nodeTopValue(0)).toBe("60px");
    expect(nodeTopValue(1)).toBe("420px");
    expect(nodeTopValue(2)).toBe("980px");
  });

  it("moves progress continuously between two publications while scrolling", async () => {
    const records = Array.from({ length: 4 }, (_, index) =>
      makePublication(index + 1),
    );
    layout.nodeOffsets = { "pub-1": 100, "pub-2": 400, "pub-3": 900, "pub-4": 1400 };
    layout.containerHeight = 2000;
    getPublications.mockResolvedValue(makeResponse(records));

    render(<Publications />);
    await waitForTimeline(4);

    // At the reading line, progress equals the reading offset, not a node edge.
    expect(progressValue()).toBe(`${READING_Y}px`);

    const scrollTo = (containerTop: number) => {
      layout.containerTop = containerTop;
      fireEvent.scroll(window);
      act(() => flushRaf());
    };

    scrollTo(READING_Y - 150);
    expect(progressValue()).toBe("150px");

    scrollTo(READING_Y - 250);
    expect(progressValue()).toBe("250px");

    scrollTo(READING_Y - 380);
    expect(progressValue()).toBe("380px");

    // The continuous values sit strictly between the node positions, proving
    // the timeline does not snap to discrete publication indexes.
    expect(Number.parseFloat(progressValue())).toBeGreaterThan(100);
    expect(Number.parseFloat(progressValue())).toBeLessThan(400);
  });

  it("recalculates node geometry on resize", async () => {
    const records = [
      makePublication(1),
      makePublication(2),
      makePublication(3),
    ];
    layout.nodeOffsets = { "pub-1": 50, "pub-2": 300, "pub-3": 700 };
    layout.containerHeight = 1200;
    getPublications.mockResolvedValue(makeResponse(records));

    render(<Publications />);
    await waitForTimeline(3);
    expect(nodeTopValue(0)).toBe("50px");

    layout.nodeOffsets = { "pub-1": 80, "pub-2": 500, "pub-3": 1100 };
    layout.containerHeight = 1600;
    act(() => {
      fireEvent(window, new Event("resize"));
    });

    await waitFor(() => expect(nodeTopValue(0)).toBe("80px"));
    expect(nodeTopValue(1)).toBe("500px");
    expect(nodeTopValue(2)).toBe("1100px");
  });

  it("rebuilds geometry when filtering changes the publication count", async () => {
    const all = Array.from({ length: 6 }, (_, index) =>
      makePublication(index + 1),
    );
    const filtered = [makePublication(9), makePublication(10)];
    getPublications.mockImplementation(
      async (params: { search?: string } | undefined) =>
        makeResponse(params?.search ? filtered : all),
    );

    const { container } = render(<Publications />);
    await waitForTimeline(6);

    layout.nodeOffsets = { "pub-9": 120, "pub-10": 460 };
    layout.containerHeight = 700;

    fireEvent.change(screen.getAllByRole("searchbox")[0]!, {
      target: { value: "ocean" },
    });

    await waitFor(() =>
      expect(container.querySelectorAll("[data-publication-id]")).toHaveLength(
        2,
      ),
    );

    // The geometry effect re-runs for the new id set and measures the new rows.
    await waitFor(() => expect(nodeTopValue(0)).toBe("120px"));
    expect(nodeTopValue(1)).toBe("460px");
    expect(getPublications).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "ocean" }),
    );
  });
});
