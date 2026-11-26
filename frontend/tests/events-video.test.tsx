import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicEvent } from "@/types/modules";

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

beforeEach(() => {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  HTMLMediaElement.prototype.pause = vi.fn();
});

describe("public events page video", () => {
  it("renders one click-to-play local video above the event cards", () => {
    const { container } = render(<PublicEventsPage initialEvents={[event]} />);

    expect(screen.getByText("Ocean Engineering Summit")).toBeInTheDocument();

    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(1);
    const video = videos[0]!;

    expect(video).toHaveAttribute("src", "/assets/0722.mp4");
    expect(video).toHaveAttribute("poster", "/assets/engineers.jpg");
    expect(video).toHaveAttribute("preload", "none");
    expect(video).not.toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video.muted).toBe(true);
    expect(
      screen.getByRole("button", { name: "Play video" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unmute video" }),
    ).not.toBeInTheDocument();
    expect(video.className).toContain("object-cover");
    expect(video.className).toContain("w-full");

    const frame = video.parentElement!;
    expect(frame.className).toContain("aspect-video");
    expect(frame.className).toContain("overflow-hidden");
    expect(frame.className).toContain("border");
    expect(frame.className).toContain("mb-10");

    const heading = container.querySelector("h1")!;
    const grid = container.querySelector(".grid")!;
    expect(
      heading.compareDocumentPosition(video) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      video.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(frame.parentElement).toBe(grid.parentElement);
  });

  it("toggles video audio after explicit playback", () => {
    const { container } = render(<PublicEventsPage initialEvents={[event]} />);
    const video = container.querySelector("video")!;

    Object.defineProperty(video, "paused", {
      configurable: true,
      value: false,
    });
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      value: 12,
    });

    fireEvent.click(screen.getByRole("button", { name: "Play video" }));
    expect(video.play).toHaveBeenCalled();

    const unmuteButton = screen.getByRole("button", { name: "Unmute video" });
    expect(video.muted).toBe(true);
    fireEvent.click(unmuteButton);

    expect(video.muted).toBe(false);
    expect(
      screen.getByRole("button", { name: "Mute video" }),
    ).toBeInTheDocument();
    expect(video.paused).toBe(false);
    expect(video.currentTime).toBe(12);
  });

  it("keeps the video visible with an empty event list", () => {
    const { container } = render(<PublicEventsPage initialEvents={[]} />);

    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "/assets/0722.mp4",
    );
  });
});
