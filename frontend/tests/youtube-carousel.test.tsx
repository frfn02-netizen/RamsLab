import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicHomepageVideo } from "@/types/modules";

const { getPublicHomepageVideos } = vi.hoisted(() => ({
  getPublicHomepageVideos: vi.fn(),
}));

vi.mock("@/lib/api/modules", () => ({ getPublicHomepageVideos }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import HomeVideoSection from "@/components/public/home-video-section";

function video(
  overrides: Partial<PublicHomepageVideo> = {},
): PublicHomepageVideo {
  return {
    id: "v1",
    title: "Video One",
    youtubeUrl: "https://youtube.com/watch?v=test",
    youtubeVideoId: "test",
    thumbnailUrl: "https://img.youtube.com/vi/test/0.jpg",
    isFeatured: false,
    order: 0,
    ...overrides,
  };
}

function activeTitle() {
  const active = document.querySelector('[data-active="true"]');
  return active?.textContent ?? "";
}

beforeEach(() => {
  getPublicHomepageVideos.mockReset();
  const matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal("matchMedia", matchMedia);
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as unknown as { matchMedia?: typeof window.matchMedia })
    .matchMedia;
  vi.restoreAllMocks();
});

describe("homepage video carousel", () => {
  it("renders each video once in a single carousel row", async () => {
    getPublicHomepageVideos.mockResolvedValue([
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
      video({ id: "v3", title: "Video Three" }),
    ]);

    render(<HomeVideoSection />);

    expect(await screen.findByText("Video One")).toBeInTheDocument();
    expect(screen.getByText("Video Two")).toBeInTheDocument();
    expect(screen.getByText("Video Three")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-active]')).toHaveLength(3);
    expect(screen.getAllByText("Video One")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "allVideos" })).toHaveAttribute(
      "href",
      "/videos",
    );
  });

  it("starts on the first card and marks the featured record", async () => {
    getPublicHomepageVideos.mockResolvedValue([
      video({ id: "v1", title: "First Video" }),
      video({ id: "v2", title: "Featured Choice", isFeatured: true }),
      video({ id: "v3", title: "Third Video" }),
    ]);

    render(<HomeVideoSection />);

    expect(await screen.findByText("First Video")).toBeInTheDocument();
    expect(activeTitle()).toContain("First Video");
    expect(screen.getByText("featured")).toBeInTheDocument();
  });

  it("synchronizes arrow navigation and pagination indicators", async () => {
    getPublicHomepageVideos.mockResolvedValue([
      video({ id: "v1", title: "Video One" }),
      video({ id: "v2", title: "Video Two" }),
      video({ id: "v3", title: "Video Three" }),
    ]);

    render(<HomeVideoSection />);
    await screen.findByText("Video One");

    const previous = screen.getByRole("button", { name: "previousVideo" });
    const next = screen.getByRole("button", { name: "nextVideo" });
    expect(previous).toBeDisabled();
    expect(activeTitle()).toContain("Video One");

    fireEvent.click(next);
    expect(activeTitle()).toContain("Video Two");
    expect(previous).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "goToVideo 3" }));
    expect(activeTitle()).toContain("Video Three");
    expect(next).toBeDisabled();
  });

  it("opens the YouTube player modal from a video card", async () => {
    getPublicHomepageVideos.mockResolvedValue([
      video({ id: "v1", title: "Video One", youtubeVideoId: "abc123" }),
    ]);

    render(<HomeVideoSection />);

    fireEvent.click(
      await screen.findByRole("button", { name: "playVideo: Video One" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Video One" });
    const iframe = dialog.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain(
      "youtube-nocookie.com/embed/abc123",
    );
    expect(iframe?.getAttribute("src")).toContain("autoplay=1");

    fireEvent.click(within(dialog).getByRole("button", { name: "closeVideo" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a graceful error state when videos cannot load", async () => {
    getPublicHomepageVideos.mockRejectedValue(new Error("failed"));

    render(<HomeVideoSection />);

    expect(await screen.findByText("error")).toBeInTheDocument();
  });
});
