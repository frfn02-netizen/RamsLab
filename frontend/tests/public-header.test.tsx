import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: (namespace: string) => {
    const messages: Record<string, Record<string, string>> = {
      nav: {
        people: "People",
        research: "Research",
        publications: "Publications",
        events: "Events",
        publicService: "Public Service",
        partners: "Partners",
      },
      brand: {
        laboratory: "RAMS Laboratory",
        technicalLine: "Reliability · Availability · Management · Safety",
      },
      a11y: {
        home: "RAMS Laboratory home",
        primaryNav: "Primary navigation",
        mobileNav: "Mobile navigation",
        openMenu: "Open navigation",
        closeMenu: "Close navigation",
        contactUs: "Contact us",
      },
    };
    return (key: string) => messages[namespace]?.[key] ?? key;
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    onClick,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
  usePathname: () => "/events",
  useRouter: () => ({ replace }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill: _fill,
    priority: _priority,
    ...props
  }: {
    alt: string;
    fill?: boolean;
    priority?: boolean;
    [key: string]: unknown;
  }) => (
    <img alt={alt} {...props} />
  ),
}));

vi.mock("@/components/public/hero-context", () => ({
  useHeroContext: () => ({ isAtTop: false }),
}));

import PublicHeader from "@/components/public/public-header";

describe("public mobile header", () => {
  it("renders a compact branded mobile header without the tagline", () => {
    render(<PublicHeader />);

    const mobileHeader = screen.getByTestId("mobile-header");
    const header = mobileHeader.parentElement!;
    expect(within(mobileHeader).getByText("RAMS Laboratory")).toBeInTheDocument();
    expect(mobileHeader.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/rams-logo.png",
    );
    expect(
      within(mobileHeader).getByRole("button", { name: "Open navigation" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      within(mobileHeader).queryByText(
        "Reliability · Availability · Management · Safety",
      ),
    ).not.toBeInTheDocument();
    expect(header.className).toContain("bg-white/85");
    expect(header.className).toContain("backdrop-blur-md");
  });

  it("opens a full-width drawer with the active navigation and working language switcher", () => {
    render(<PublicHeader />);

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const drawer = screen.getByTestId("mobile-public-navigation");
    expect(drawer).toHaveAttribute("aria-hidden", "false");
    expect(drawer.className).toContain("inset-x-0");
    expect(drawer.className).toContain("h-dvh");
    expect(drawer.className).toContain("bg-white");
    expect(within(drawer).getByText("Reliability · Availability · Management · Safety")).toBeInTheDocument();

    for (const label of [
      "People",
      "Research",
      "Publications",
      "Events",
      "Public Service",
      "Partners",
    ]) {
      expect(within(drawer).getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(within(drawer).getByRole("link", { name: "Events" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(within(drawer).getByRole("button", { name: "ID" }));
    expect(replace).toHaveBeenCalledWith("/events", { locale: "id" });
  });

  it("closes from its close button and preserves close-on-navigation", () => {
    render(<PublicHeader />);
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const drawer = screen.getByTestId("mobile-public-navigation");
    expect(screen.getByRole("button", { name: "Close navigation" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(drawer).toHaveAttribute("aria-hidden", "true");

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    fireEvent.click(within(drawer).getByRole("link", { name: "People" }));
    expect(drawer).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the desktop navigation and language switcher in their desktop-only container", () => {
    render(<PublicHeader />);

    const desktopNavigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(desktopNavigation.className).toContain("lg:flex");
    expect(within(desktopNavigation).getByRole("link", { name: "Events" })).toBeInTheDocument();
    expect(within(desktopNavigation).getByRole("link", { name: "Contact us" })).toBeInTheDocument();
  });
});
