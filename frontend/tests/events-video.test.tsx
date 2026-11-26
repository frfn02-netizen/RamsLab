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

const playMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  playMock.mockClear();
  HTMLMediaElement.prototype.play = playMock;
  HTMLMediaElement.prototype.pause = vi.fn();
});

describe("public events page", () => {
  it("autoplays the local showcase video above the event cards", () => {
    const { container } = render(<PublicEventsPage initialEvents={[event]} />);

    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(1);
    const video = videos[0]!;

    expect(video).toHaveAttribute("src", "/assets/0722.mp4");
    expect(video).toHaveAttribute("poster", "/assets/engineers.jpg");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).toHaveAttribute("autoplay");
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("playsinline");
    expect(video.muted).toBe(true);
    expect(video.defaultMuted).toBe(true);
    expect(playMock).toHaveBeenCalled();

    const frame = video.parentElement!;
    expect(frame.className).toContain("aspect-[16/9]");
    expect(frame.className).toContain("lg:aspect-[21/9]");
    expect(frame.className).toContain("rounded-2xl");
    expect(frame.className).toContain("border-stone-200");
    expect(frame.className).toContain("bg-stone-950");
    expect(frame.className).toContain("mt-8");

    const card = screen.getByRole("article");
    expect(
      video.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(
      screen.queryByRole("button", { name: "Play video" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unmute video" }),
    ).toBeInTheDocument();
  });

  it("keeps the mute toggle working while the video autoplays", () => {
    const { container } = render(<PublicEventsPage initialEvents={[event]} />);
    const video = container.querySelector("video")!;

    expect(video.muted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Unmute video" }));
    expect(video.muted).toBe(false);
    expect(
      screen.getByRole("button", { name: "Mute video" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mute video" }));
    expect(video.muted).toBe(true);
    expect(
      screen.getByRole("button", { name: "Unmute video" }),
    ).toBeInTheDocument();
  });

  it("shares one max-w-7xl container across masthead, video, and grid", () => {
    const { container } = render(<PublicEventsPage initialEvents={[event]} />);

    const shell = container.querySelector(".max-w-7xl")!;
    expect(shell.className).toContain("mx-auto");
    expect(shell.className).toContain("px-4");
    expect(shell.className).toContain("sm:px-6");
    expect(shell.className).toContain("lg:px-8");

    const header = container.querySelector("header")!;
    const video = container.querySelector("video")!;
    const card = screen.getByRole("article");
    expect(shell).toContainElement(header);
    expect(shell).toContainElement(video);
    expect(shell).toContainElement(card);
  });

  it("renders the typographic masthead", () => {
    const { container } = render(<PublicEventsPage initialEvents={[event]} />);

    const header = container.querySelector("header")!;
    expect(header.className).toContain("grid-cols-1");
    expect(header.className).toContain("lg:grid-cols-12");
    expect(header.className).toContain("lg:items-end");
    expect(header.className).toContain("gap-6");
    expect(header.className).toContain("border-b");
    expect(header.className).toContain("border-stone-200");
    expect(header.className).toContain("py-8");
    expect(header.className).toContain("lg:py-10");

    expect(screen.getByText("eyebrow")).toHaveClass("text-[11px]");
    expect(screen.getByText("eyebrow")).toHaveClass("uppercase");
    expect(screen.getByText("eyebrow")).toHaveClass("tracking-[0.14em]");
    expect(screen.getByRole("heading", { name: "title" })).toHaveClass(
      "text-stone-900",
    );
    expect(screen.getByText("description")).toHaveClass("lg:ml-auto");
  });

  it("renders a balanced three-column archive grid with uniform cards", () => {
    const { container } = render(
      <PublicEventsPage initialEvents={[event, { ...event, id: "ev-2" }]} />,
    );

    const firstCard = screen.getAllByRole("article")[0]!;
    const grid = firstCard.parentElement!;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("md:grid-cols-2");
    expect(grid.className).toContain("lg:grid-cols-3");
    expect(grid.className).toContain("gap-6");

    const section = grid.parentElement!;
    expect(section.className).toContain("mt-10");
    expect(section.className).toContain("pb-16");

    expect(firstCard.className).toContain("flex");
    expect(firstCard.className).toContain("flex-col");
    expect(firstCard.className).toContain("rounded-xl");
    expect(firstCard.className).toContain("border-stone-200");
    expect(firstCard.className).toContain("hover:shadow-sm");

    const frame = firstCard.firstElementChild!;
    expect(frame.className).toContain("aspect-[16/10]");
    expect(frame.className).toContain("overflow-hidden");
    expect(frame.className).toContain("bg-stone-100");

    const title = screen.getAllByRole("heading", {
      name: "Ocean Engineering Summit",
    })[0]!;
    expect(title.className).toContain("group-hover:text-red-700");
    expect(title.className).toContain("line-clamp-2");

    const excerpt = screen.getAllByText("A public event")[0]!;
    expect(excerpt.className).toContain("line-clamp-2");

    const meta = screen.getAllByText(/Surabaya/)[0]!.closest("p")!;
    expect(meta.className).toContain("text-red-700");
    expect(meta.className).toContain("uppercase");
    expect(meta.className).toContain("tracking-[0.14em]");

    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("renders an image thumbnail when the event provides one", () => {
    const withImage: PublicEvent = {
      ...event,
      image: {
        url: "https://example.test/event.jpg",
        alt: { en: "Summit stage", id: "Panggung summit" },
      },
    };

    const { container } = render(
      <PublicEventsPage initialEvents={[withImage]} />,
    );

    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://example.test/event.jpg");
    expect(img).toHaveAttribute("alt", "Summit stage");
    expect(img.className).toContain("object-cover");
  });

  it("keeps the showcase video visible with an empty event list", () => {
    const { container } = render(<PublicEventsPage initialEvents={[]} />);

    expect(container.querySelectorAll("video")).toHaveLength(1);
    expect(container.querySelector("video")).toHaveAttribute(
      "src",
      "/assets/0722.mp4",
    );
    expect(screen.getByText("noPublishedRecords")).toBeInTheDocument();
  });
});
