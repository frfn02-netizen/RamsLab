import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: any) => (
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
  default: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/lib/i18n/metadata", () => ({
  localizedMetadata: () => ({ title: "", description: "" }),
}));

import TeamPage from "@/app/(public)/[locale]/team/page";

describe("Team page CTA", () => {
  it("links the 'Get in touch' CTA to /contact", () => {
    render(<TeamPage />);
    const link = screen.getByRole("link", { name: /get in touch/i });
    expect(link).toHaveAttribute("href", "/contact");
  });
});
