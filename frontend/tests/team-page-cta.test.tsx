import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

type LinkProps = {
  href?: string;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: LinkProps) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/team",
}));

const translations: Record<string, string> = {
  primaryCta: "Get in touch",
  ctaTitle: "Connect with our people",
  ctaDescription:
    "Meet the researchers and experts behind RAMS Laboratory and explore opportunities for collaboration.",
  ctaPrimary: "Get in touch",
  nextConversation: "Next conversation",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => translations[key] ?? key,
}));

vi.mock("@/components/public/team-directory", () => ({
  default: () => <div data-testid="team-directory" />,
}));

vi.mock("@/components/public/reveal-on-scroll", () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/i18n/metadata", () => ({
  localizedMetadata: () => ({ title: "", description: "" }),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => translations[key] ?? key,
}));

vi.mock("@/lib/api/modules", () => ({
  getPublicPeopleList: async () => ({
    DOSEN: [],
    MAHASISWA: [],
    MASTER: [],
    UNDERGRADUATE: [],
    INTERNSHIP: [],
    ALUMNI: [],
  }),
}));

import TeamPage from "@/app/(public)/[locale]/team/page";

describe("Team page CTA", () => {
  it("links the 'Get in touch' CTA to /contact", async () => {
    const page = await TeamPage({ params: Promise.resolve({ locale: "en" }) });
    render(page);
    const link = screen.getByRole("link", { name: /get in touch/i });
    expect(link).toHaveAttribute("href", "/contact");
  });
});
