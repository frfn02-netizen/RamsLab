import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PublicEvent } from "@/types/modules";

const { getPublicEvents } = vi.hoisted(() => ({ getPublicEvents: vi.fn() }));

vi.mock("@/lib/api/modules", () => ({ getPublicEvents }));
vi.mock("next-intl", () => ({
  useLocale: () => "en",
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
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...props} />
  ),
}));

import PublicEventsPage from "@/components/public/events/public-events-page";

const event: PublicEvent = {
  id: "ev-1",
  title: { en: "Ocean Engineering Summit", id: "Ocean Engineering Summit" },
  description: { en: "A public event", id: "Acara publik" },
  eventDate: "2026-01-15",
  location: { en: "Surabaya", id: "Surabaya" },
  order: 1,
};

describe("public events page video", () => {
  it("renders exactly one local video above the existing event cards", async () => {
    getPublicEvents.mockResolvedValue([event]);

    const { container } = render(<PublicEventsPage />);

    await waitFor(() =>
      expect(
        screen.getByText("Ocean Engineering Summit"),
      ).toBeInTheDocument(),
    );

    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(1);
    const video = videos[0]!;

    // Local hardcoded asset, no API/database involved.
    expect(video).toHaveAttribute("src", "/assets/0722.mp4");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video.muted).toBe(true);
    expect(
      screen.getByRole("button", { name: "Unmute video" }),
    ).toBeInTheDocument();
    expect(video.className).toContain("object-cover");
    expect(video.className).toContain("w-full");

    // Stable aspect ratio, overflow hidden, spacing before the cards.
    const frame = video.parentElement!;
    expect(frame.className).toContain("aspect-video");
    expect(frame.className).toContain("overflow-hidden");
    expect(frame.className).toContain("border");
    expect(frame.className).toContain("mb-10");
    // No dedicated heading for the video.
    expect(frame.querySelector("h1, h2, h3")).toBeNull();

    // Layout order: header -> video -> cards grid.
    const heading = container.querySelector("h1")!;
    const grid = container.querySelector(".grid")!;
    expect(
      heading.compareDocumentPosition(video) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      video.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // Same content container as the event cards.
    expect(frame.parentElement).toBe(grid.parentElement);
  });

  it("toggles video audio without interrupting playback", () => {
    getPublicEvents.mockReturnValue(new Promise(() => {}));

    const { container } = render(<PublicEventsPage />);
    const video = container.querySelector("video")!;
    const unmuteButton = screen.getByRole("button", { name: "Unmute video" });

    Object.defineProperty(video, "paused", {
      configurable: true,
      value: false,
    });
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      value: 12,
    });

    expect(video.muted).toBe(true);
    fireEvent.click(unmuteButton);

    expect(video.muted).toBe(false);
    expect(screen.getByRole("button", { name: "Mute video" })).toBeInTheDocument();
    expect(video.paused).toBe(false);
    expect(video.currentTime).toBe(12);

    fireEvent.click(screen.getByRole("button", { name: "Mute video" }));

    expect(video.muted).toBe(true);
    expect(screen.getByRole("button", { name: "Unmute video" })).toBeInTheDocument();
    expect(video.paused).toBe(false);
    expect(video.currentTime).toBe(12);
  });

  it("keeps the existing event data fetching unchanged", async () => {
    getPublicEvents.mockClear();
    getPublicEvents.mockResolvedValue([event]);

    render(<PublicEventsPage />);

    await waitFor(() => expect(getPublicEvents).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Ocean Engineering Summit")).toBeInTheDocument();
  });

  it("shows the video even while events are still loading", () => {
    getPublicEvents.mockReturnValue(new Promise(() => {}));

    const { container } = render(<PublicEventsPage />);

    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "/assets/0722.mp4",
    );
  });
});
