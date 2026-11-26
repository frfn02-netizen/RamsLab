import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import VideoCarousel, {
  type CmsVideoItem,
} from "@/components/public/video-carousel";

const WATCH_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

function video(overrides: Partial<CmsVideoItem> = {}): CmsVideoItem {
  return {
    id: "v1",
    youtubeUrl: WATCH_URL,
    title: "Video One",
    thumbnailUrl: null,
    displayOrder: 0,
    featured: false,
    published: true,
    ...overrides,
  };
}

function activeTitle() {
  const active = document.querySelector('[data-active="true"]');
  return active?.textContent ?? "";
}

function middleCards() {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-copy="middle"]'),
  );
}

function middleCardByTitle(title: string) {
  const card = middleCards().find(
    (candidate) => candidate.querySelector("h3")?.textContent?.trim() === title,
  );
  if (!card) throw new Error(`Middle card not found: ${title}`);
  return card;
}

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("homepage video carousel", () => {
  it("renders each video in the middle track copy and links to the archive", async () => {
    const videos = [
      video({ id: "v1", title: "Video One", youtubeUrl: WATCH_URL }),
      video({
        id: "v2",
        title: "Video Two",
        youtubeUrl: "https://youtu.be/abcdefghijk",
      }),
      video({
        id: "v3",
        title: "Video Three",
        youtubeUrl: "https://www.youtube.com/embed/lmnopqrstuv",
      }),
    ];

    render(<VideoCarousel videos={videos} />);

    const middle = middleCards();
    expect(middle).toHaveLength(3);
    expect(within(middle[0]).getByText("Video One")).toBeInTheDocument();
    expect(within(middle[1]).getByText("Video Two")).toBeInTheDocument();
    expect(within(middle[2]).getByText("Video Three")).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-copy="left"], [data-copy="right"]'),
    ).toHaveLength(6);
    expect(screen.getByRole("link", { name: "allVideos" })).toHaveAttribute(
      "href",
      "/videos",
    );
  });

  it("starts on the first featured record after display order sorting", async () => {
    const videos = [
      video({ id: "v1", title: "First Video", displayOrder: 0 }),
      video({
        id: "v2",
        title: "Featured Choice",
        displayOrder: 2,
        featured: true,
      }),
      video({ id: "v3", title: "Third Video", displayOrder: 1 }),
    ];

    render(<VideoCarousel videos={videos} />);

    expect(
      within(middleCardByTitle("Featured Choice")).getByText("Featured Choice"),
    ).toBeInTheDocument();
    expect(activeTitle()).toContain("Featured Choice");
  });

  it("filters unpublished records and invalid YouTube URLs", async () => {
    const videos = [
      video({ id: "v1", title: "Published Video" }),
      video({ id: "v2", title: "Draft Video", published: false }),
      video({
        id: "v3",
        title: "Invalid URL",
        youtubeUrl: "https://example.com/watch?v=dQw4w9WgXcQ",
      }),
    ];

    render(<VideoCarousel videos={videos} />);

    expect(await screen.findByText("Published Video")).toBeInTheDocument();
    expect(screen.queryByText("Draft Video")).not.toBeInTheDocument();
    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-active]")).toHaveLength(1);
  });

  it("uses a stable fallback title when the CMS title is empty", async () => {
    render(
      <VideoCarousel
        videos={[video({ id: "v1", title: "   ", youtubeUrl: WATCH_URL })]}
      />,
    );

    expect(await screen.findByText("titleFallback")).toBeInTheDocument();
  });

  it("supports one and two record edge cases without duplicate cards", async () => {
    const { rerender } = render(
      <VideoCarousel videos={[video({ id: "v1", title: "Only Video" })]} />,
    );

    expect(await screen.findByText("Only Video")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-active]")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "previousVideo" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "nextVideo" })).toBeDisabled();

    rerender(
      <VideoCarousel
        videos={[
          video({ id: "v1", title: "First Video" }),
          video({
            id: "v2",
            title: "Second Video",
            youtubeUrl: "https://youtu.be/abcdefghijk",
          }),
        ]}
      />,
    );

    expect(await screen.findByText("Second Video")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-active]")).toHaveLength(2);
    expect(screen.getAllByText("First Video")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "nextVideo" }));
    expect(activeTitle()).toContain("Second Video");
  });

  it("synchronizes arrow navigation, wrapping, and pagination indicators", async () => {
    const videos = [
      video({ id: "v1", title: "Video One", displayOrder: 0 }),
      video({
        id: "v2",
        title: "Video Two",
        displayOrder: 1,
        youtubeUrl: "https://youtu.be/abcdefghijk",
      }),
      video({
        id: "v3",
        title: "Video Three",
        displayOrder: 2,
        youtubeUrl: "https://www.youtube.com/embed/lmnopqrstuv",
      }),
    ];

    render(<VideoCarousel videos={videos} />);
    expect(
      within(middleCardByTitle("Video One")).getByText("Video One"),
    ).toBeInTheDocument();

    const previous = screen.getByRole("button", { name: "previousVideo" });
    const next = screen.getByRole("button", { name: "nextVideo" });
    expect(previous).not.toBeDisabled();
    expect(activeTitle()).toContain("Video One");

    fireEvent.click(next);
    expect(activeTitle()).toContain("Video Two");

    fireEvent.click(previous);
    expect(activeTitle()).toContain("Video One");

    fireEvent.click(screen.getByRole("button", { name: "goToVideo 3" }));
    expect(activeTitle()).toContain("Video Three");

    fireEvent.click(next);
    expect(activeTitle()).toContain("Video One");
  });

  it("centers an inactive side card without opening the modal", async () => {
    const videos = [
      video({ id: "v1", title: "Video One", displayOrder: 0 }),
      video({
        id: "v2",
        title: "Video Two",
        displayOrder: 1,
        youtubeUrl: "https://youtu.be/abcdefghijk",
      }),
      video({
        id: "v3",
        title: "Video Three",
        displayOrder: 2,
        youtubeUrl: "https://www.youtube.com/embed/lmnopqrstuv",
      }),
    ];

    render(<VideoCarousel videos={videos} />);
    const sideVideoCard = middleCardByTitle("Video Two");
    expect(within(sideVideoCard).getByText("Video Two")).toBeInTheDocument();

    const sideCard = within(sideVideoCard)
      .getByText("Video Two")
      .closest("[data-active]");
    expect(sideCard).not.toBeNull();
    fireEvent.click(
      within(sideCard as HTMLElement).getByRole("button", {
        name: "watchVideo: Video Two",
      }),
    );

    expect(activeTitle()).toContain("Video Two");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("walks the thumbnail waterfall from CMS image to maxres, hq, then branded fallback", async () => {
    const { container } = render(
      <VideoCarousel
        videos={[
          video({
            id: "v1",
            title: "Waterfall Video",
            thumbnailUrl: "https://example.com/broken-thumbnail.jpg",
          }),
        ]}
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://example.com/broken-thumbnail.jpg",
    );

    fireEvent.error(container.querySelector("img")!);
    await waitFor(() =>
      expect(container.querySelector("img")).toHaveAttribute(
        "src",
        "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      ),
    );

    fireEvent.error(container.querySelector("img")!);
    await waitFor(() =>
      expect(container.querySelector("img")).toHaveAttribute(
        "src",
        "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      ),
    );

    fireEvent.error(container.querySelector("img")!);
    await waitFor(() => expect(container.querySelector("img")).toBeNull());
    expect(
      screen.getByText("RAMS Laboratory", { exact: true }),
    ).toBeInTheDocument();
  });

  it("opens the YouTube player from the active card and closes it", async () => {
    render(
      <VideoCarousel
        videos={[
          video({
            id: "v1",
            title: "Video One",
            youtubeUrl: "https://www.youtube.com/watch?v=abc123def45",
          }),
        ]}
      />,
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: "watchVideo: Video One",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Video One" });
    const iframe = dialog.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain(
      "youtube-nocookie.com/embed/abc123def45",
    );
    expect(iframe?.getAttribute("src")).toContain("autoplay=1");

    fireEvent.click(within(dialog).getByRole("button", { name: "closeVideo" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
