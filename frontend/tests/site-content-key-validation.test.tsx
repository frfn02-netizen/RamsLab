import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardContentEditorPage from "@/app/dashboard/content/[key]/page";
import SiteContentEditor from "@/components/dashboard/site-content-editor";
import { isSiteContentKey, SITE_CONTENT_KEYS } from "@/types/site-content";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

function renderPage(key: string) {
  return DashboardContentEditorPage({ params: Promise.resolve({ key }) });
}

describe("site content key validation", () => {
  it("accepts every configured CMS key", () => {
    for (const key of SITE_CONTENT_KEYS) {
      expect(isSiteContentKey(key)).toBe(true);
    }
  });

  it("rejects dashboard slugs that are not CMS keys", () => {
    for (const key of ["publications", "projects", "lecturers"]) {
      expect(isSiteContentKey(key)).toBe(false);
    }
  });

  it.each(["publications", "projects", "lecturers"])(
    "answers /dashboard/content/%s with a 404",
    async (key) => {
      await expect(renderPage(key)).rejects.toThrow("NEXT_NOT_FOUND");
    },
  );

  it("renders the editor for a valid CMS key", async () => {
    const node = await renderPage("contact");
    expect(node).toHaveProperty("props.keyName", "contact");
  });

  it("keeps an explicit invalid state in the editor fallback", () => {
    render(<SiteContentEditor keyName="publications" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid site content page.",
    );
  });
});
