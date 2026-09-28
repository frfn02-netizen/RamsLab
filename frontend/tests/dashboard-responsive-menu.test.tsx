import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

const state = vi.hoisted(() => ({ role: "ADMIN" }));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: state.role
      ? { id: "u1", email: "user@example.com", role: state.role }
      : null,
    status: "authenticated",
    logout: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <span data-testid="next-image" data-src={src} data-alt={alt} />
  ),
}));

function openMobileMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
}

function hrefs(root: Element): string[] {
  return Array.from(root.querySelectorAll("a")).map(
    (anchor) => anchor.getAttribute("href") ?? "",
  );
}

function mobileMenuHrefs(base: HTMLElement): string[] {
  const menu = base.querySelector("#mobile-dashboard-navigation");
  expect(menu).not.toBeNull();
  return hrefs(menu as Element);
}

function sidebarHrefs(base: HTMLElement): string[] {
  const aside = base.querySelector("aside");
  expect(aside).not.toBeNull();
  return hrefs(aside as Element);
}

function renderMenuPair() {
  const header = render(<Header />);
  openMobileMenu();
  const mobile = mobileMenuHrefs(header.container);

  const sidebar = render(<Sidebar />);
  const desktop = sidebarHrefs(sidebar.container);

  return { mobile, desktop, headerContainer: header.container };
}

describe("dashboard responsive menu", () => {
  beforeEach(() => {
    state.role = "ADMIN";
  });

  it("exposes exactly the same links as the desktop sidebar", () => {
    const { mobile, desktop } = renderMenuPair();

    expect(mobile).toEqual(desktop);
    expect(mobile).toContain("/dashboard");
    expect(mobile).toContain("/dashboard/content/homepage");
  });

  it("links Publications to the publications workspace instead of the CMS editor", () => {
    const header = render(<Header />);
    openMobileMenu();

    expect(
      screen.getByRole("link", { name: "Publications" }),
    ).toHaveAttribute("href", "/dashboard/publications");
    expect(mobileMenuHrefs(header.container)).not.toContain(
      "/dashboard/content/publications",
    );
  });

  it("never links dashboard routes that no longer exist", () => {
    const { mobile, desktop, headerContainer } = renderMenuPair();

    for (const href of ["/dashboard/projects", "/dashboard/lecturers"]) {
      expect(mobile).not.toContain(href);
      expect(desktop).not.toContain(href);
    }

    expect(
      within(headerContainer).getByRole("link", { name: "Lecturers" }),
    ).toHaveAttribute("href", "/dashboard/dosen");
  });

  it("applies the sidebar role filtering to the mobile menu as well", () => {
    state.role = "PUBLICATION_EDITOR";

    const { mobile, desktop } = renderMenuPair();

    expect(mobile).toEqual(["/dashboard", "/dashboard/publications"]);
    expect(desktop).toEqual(mobile);
  });
});
