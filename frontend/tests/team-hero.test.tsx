import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const messages: Record<string, string> = {
  heroEyebrow: "PEOPLE & EXPERTISE",
  heroTitle: "The people behind reliable research.",
  heroDescription:
    "Meet the researchers, academics, and emerging talents driving RAMS Laboratory forward.",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => messages[key] ?? key,
}));

import TeamHero from "@/components/public/team-hero";

describe("Team masthead", () => {
  it("renders a pure typographic two-column split", () => {
    const { container } = render(<TeamHero />);

    const eyebrow = screen.getByText("PEOPLE & EXPERTISE");
    expect(eyebrow.className).toContain("text-[11px]");
    expect(eyebrow.className).toContain("uppercase");
    expect(eyebrow.className).toContain("tracking-[0.14em]");
    expect(eyebrow.className).toContain("text-stone-400");

    const heading = screen.getByRole("heading", {
      name: "The people behind reliable research.",
    });
    expect(heading.className).toContain("text-3xl");
    expect(heading.className).toContain("sm:text-4xl");
    expect(heading.className).toContain("font-bold");
    expect(heading.className).toContain("text-stone-900");
    expect(heading.className).toContain("leading-[1.12]");

    const summary = screen.getByText(
      "Meet the researchers, academics, and emerging talents driving RAMS Laboratory forward.",
    );
    expect(summary.className).toContain("max-w-xl");
    expect(summary.className).toContain("text-stone-600");
    expect(summary.className).toContain("lg:ml-auto");

    const grid = container.querySelector(".grid")!;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("lg:grid-cols-12");
    expect(grid.className).toContain("lg:items-end");
    expect(grid.className).toContain("gap-6");
    expect(grid.className).toContain("lg:gap-10");
    expect(grid.className).toContain("py-8");
    expect(grid.className).toContain("lg:py-10");
  });

  it("includes no illustration, SVG, or CTA buttons", () => {
    const { container } = render(<TeamHero />);

    expect(container.querySelector("svg")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelectorAll("a")).toHaveLength(0);
    expect(
      screen.queryByRole("link", { name: "Explore our team" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "About RAMS" }),
    ).not.toBeInTheDocument();
  });
});
