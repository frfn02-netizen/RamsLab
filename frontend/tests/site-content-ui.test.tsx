import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SiteContentPage from "@/components/dashboard/site-content-page";
import SiteContentEditor from "@/components/dashboard/site-content-editor";
import type { SiteContentAdminEnvelope } from "@/types/site-content";
import { content } from "./site-content.test-data";

const { getAdminSiteContentList, getAdminSiteContent, updateAdminSiteContent } =
  vi.hoisted(() => ({
    getAdminSiteContentList: vi.fn(),
    getAdminSiteContent: vi.fn(),
    updateAdminSiteContent: vi.fn(),
  }));
vi.mock("@/lib/api/modules", () => ({
  getAdminSiteContentList,
  getAdminSiteContent,
  updateAdminSiteContent,
}));

const record: SiteContentAdminEnvelope<"homepage"> = {
  key: "homepage",
  page: "homepage",
  content,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("site content dashboard", () => {
  it("renders the four content groups", async () => {
    getAdminSiteContentList.mockResolvedValue([record]);
    render(<SiteContentPage />);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Homepage" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Contact" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Footer" })).toBeInTheDocument();
  });

  it("loads and saves a bilingual homepage editor", async () => {
    getAdminSiteContent.mockResolvedValue(record);
    updateAdminSiteContent.mockResolvedValue(record);
    render(<SiteContentEditor keyName="homepage" />);
    await waitFor(() =>
      expect(screen.getByDisplayValue("English")).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue("Indonesia")).toBeInTheDocument();
    screen.getByRole("button", { name: "Save content" }).click();
    await waitFor(() =>
      expect(updateAdminSiteContent).toHaveBeenCalledWith("homepage", content),
    );
  });
});
