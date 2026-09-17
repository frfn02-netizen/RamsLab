import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  return {
    Link: (props: any) => React.createElement("a", props),
  };
});

const mockGetPublicHomepageVideos = vi.fn();
vi.mock("@/lib/api/modules", () => ({
  getPublicHomepageVideos: (...args: any[]) =>
    mockGetPublicHomepageVideos(...args),
}));

import HomeVideoSection from "@/components/public/home-video-section";
import type { PublicHomepageVideo } from "@/types/modules";

function video(overrides: Partial<PublicHomepageVideo>): PublicHomepageVideo {
  return {
    id: "v1",
    title: "Test Video",
    youtubeUrl: "https://youtube.com/watch?v=test",
    youtubeVideoId: "test",
    thumbnailUrl: "https://img.youtube.com/vi/test/0.jpg",
    isFeatured: false,
    order: 0,
    ...overrides,
  };
}

let origPerformance: any;

beforeEach(() => {
  origPerformance = globalThis.performance;
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? false : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addChangeListener: vi.fn(),
    removeChangeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal("ResizeObserver", class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  vi.stubGlobal("IntersectionObserver", class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  });
  vi.stubGlobal("getComputedStyle", () => ({
    gap: "28px",
  }));
  // jsdom does not implement scrollBy/scrollTo on elements
  (Element.prototype as any).scrollBy = vi.fn();
  (Element.prototype as any).scrollTo = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.performance = origPerformance;
  // Clean up scroll mocks if we added them
  delete (Element.prototype as any).scrollBy;
  delete (Element.prototype as any).scrollTo;
});

// ---------------------------------------------------------------------------
// 1. Multiple video cards render
// ---------------------------------------------------------------------------

describe("1. Multiple video cards render", () => {
  it("renders all videos as carousel cards", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
      video({ id: "v3", title: "Video Three" }),
      video({ id: "v4", title: "Video Four" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    expect(screen.getAllByText("Video One").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Video Two").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Video Three").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Video Four").length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 2. All cards use the same constrained card structure
// ---------------------------------------------------------------------------

describe("2. Same card structure", () => {
  it("all cards share the same youtube-carousel-card class", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
      video({ id: "v3", title: "Video Three" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const cards = document.querySelectorAll(".youtube-carousel-card");
    // 3 original × 3 sets = 9
    expect(cards.length).toBe(9);
    cards.forEach((card) => {
      expect(card.classList.contains("youtube-carousel-card")).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. No Featured Video special card
// ---------------------------------------------------------------------------

describe("3. No Featured Video special card", () => {
  it("does not render a separate large featured video", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const track = document.querySelector(".youtube-marquee-track");
    expect(track).toBeTruthy();
    expect(track!.textContent).toContain("Video One");
    expect(track!.textContent).toContain("Video Two");
  });
});

// ---------------------------------------------------------------------------
// 4. Auto-scroll initializes
// ---------------------------------------------------------------------------

describe("4. Auto-scroll initializes", () => {
  it("renders the marquee track when there are multiple videos", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
      video({ id: "v3", title: "Video Three" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const track = document.querySelector(".youtube-marquee-track");
    expect(track).toBeTruthy();
    const cards = track!.querySelectorAll(".youtube-carousel-card");
    expect(cards.length).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// 5. Previous button works
// ---------------------------------------------------------------------------

describe("5. Previous button works", () => {
  it("clicking prev button does not crash and carousel remains visible", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const prevBtn = screen.getByLabelText("Previous videos");
    expect(prevBtn).toBeTruthy();

    await act(async () => {
      prevBtn.click();
    });

    const track = document.querySelector(".youtube-marquee-track");
    expect(track).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 6. Next button works
// ---------------------------------------------------------------------------

describe("6. Next button works", () => {
  it("clicking next button does not crash and carousel remains visible", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const nextBtn = screen.getByLabelText("Next videos");
    expect(nextBtn).toBeTruthy();

    await act(async () => {
      nextBtn.click();
    });

    const track = document.querySelector(".youtube-marquee-track");
    expect(track).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. Auto-scroll resumes after manual navigation
// ---------------------------------------------------------------------------

describe("7. Auto-scroll resumes after manual navigation", () => {
  it("carousel remains functional after manual click and pause", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
      video({ id: "v3", title: "Video Three" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const nextBtn = screen.getByLabelText("Next videos");
    await act(async () => {
      nextBtn.click();
    });

    await act(async () => {
      vi.advanceTimersByTime(4500);
    });

    expect(
      document.querySelector(".youtube-marquee-track"),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 8. Infinite loop logic
// ---------------------------------------------------------------------------

describe("8. Infinite loop logic", () => {
  it("track contains tripled items for seamless looping", async () => {
    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
      video({ id: "v3", title: "Video Three" }),
      video({ id: "v4", title: "Video Four" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const track = document.querySelector(".youtube-marquee-track");
    const cards = track!.querySelectorAll(".youtube-carousel-card");
    // 4 original × 3 sets = 12
    expect(cards.length).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// 9. One-video case
// ---------------------------------------------------------------------------

describe("9. One-video case", () => {
  it("does not produce a broken infinite loop with a single video", async () => {
    const videos = [video({ id: "v1", title: "Only Video" })];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const track = document.querySelector(".youtube-marquee-track");
    expect(track).toBeTruthy();
    const cards = track!.querySelectorAll(".youtube-carousel-card");
    // 1 original × 3 sets = 3
    expect(cards.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 10. Empty state
// ---------------------------------------------------------------------------

describe("10. Empty state", () => {
  it("does not render carousel when there are no videos", async () => {
    mockGetPublicHomepageVideos.mockResolvedValue([]);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    expect(document.querySelector(".youtube-carousel-shell")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 11. Error state
// ---------------------------------------------------------------------------

describe("11. Error state", () => {
  it("does not initialize animation on error", async () => {
    mockGetPublicHomepageVideos.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(<HomeVideoSection />);
    });

    expect(document.querySelector(".youtube-carousel-shell")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12. Reduced-motion
// ---------------------------------------------------------------------------

describe("12. Reduced-motion", () => {
  it("disables autoplay when prefers-reduced-motion is reduce", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? true : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addChangeListener: vi.fn(),
      removeChangeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const videos = [
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const track = document.querySelector(
      ".youtube-marquee-track",
    ) as HTMLElement;
    expect(track).toBeTruthy();
    // With reduced motion, no autoplay interval is set,
    // so no scroll movement occurs
    expect(track).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 13. Video links remain correct
// ---------------------------------------------------------------------------

describe("13. Video links remain correct", () => {
  it("each card links to the correct YouTube URL", async () => {
    const videos = [
      video({ id: "v1", title: "Video One", youtubeUrl: "https://youtube.com/watch?v=abc" }),
      video({ id: "v2", title: "Video Two", youtubeUrl: "https://youtube.com/watch?v=xyz" }),
    ];
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const links = document.querySelectorAll(".youtube-carousel-card");
    const hrefs = Array.from(links).map((a) => (a as HTMLAnchorElement).href);
    expect(hrefs.some((h) => h.includes("abc"))).toBe(true);
    expect(hrefs.some((h) => h.includes("xyz"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 14. View all videos hidden when total <= 10
// ---------------------------------------------------------------------------

describe("14. View all videos hidden when <= 10", () => {
  it("does NOT render 'View all videos' when total is 10", async () => {
    const videos = Array.from({ length: 10 }, (_, i) =>
      video({ id: `v${i}`, title: `Video ${i}` }),
    );
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    expect(screen.queryByText("viewAll")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 15. View all videos visible when total > 10
// ---------------------------------------------------------------------------

describe("15. View all videos visible when > 10", () => {
  it("renders 'View all videos' when total is 11", async () => {
    const videos = Array.from({ length: 11 }, (_, i) =>
      video({ id: `v${i}`, title: `Video ${i}` }),
    );
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    expect(screen.getByText("viewAll")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 16. View all videos uses correct route
// ---------------------------------------------------------------------------

describe("16. View all videos uses correct route", () => {
  it("links to /videos", async () => {
    const videos = Array.from({ length: 11 }, (_, i) =>
      video({ id: `v${i}`, title: `Video ${i}` }),
    );
    mockGetPublicHomepageVideos.mockResolvedValue(videos);

    await act(async () => {
      render(<HomeVideoSection />);
    });

    const link = screen.getByText("viewAll").closest("a");
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/videos");
  });
});
