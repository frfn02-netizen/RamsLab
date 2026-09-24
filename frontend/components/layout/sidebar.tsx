"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-providers";
import { assetPath } from "@/lib/asset-path";
import { hasPermission } from "@/lib/authz";
import type { ReactNode } from "react";

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[18px] w-[18px] shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  dashboard: (
    <Icon d="M2.5 7.5V15a1 1 0 001 1h4v-4.5h5V16h4a1 1 0 001-1V7.5M10 3v4.5" />
  ),
  homepage: <Icon d="M2.5 10L10 3l7.5 7M4 8.5V16h4.5v-4h3v4H16V8.5" />,
  about: (
    <Icon d="M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM10 11v.01M10 7v3.5" />
  ),
  contact: (
    <Icon d="M3 5.5h14a1 1 0 011 1v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-7a1 1 0 011-1zM2 5.5l8 5.5 8-5.5" />
  ),
  footer: <Icon d="M3 4h14M3 8h14M3 12h10M3 16h6" />,
  research: <Icon d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z" />,
  highlights: (
    <Icon d="M10 2.5l2.47 5.01L18 8.26l-4 3.9.94 5.49L10 15.14l-4.94 2.51.94-5.49-4-3.9 5.53-.75z" />
  ),
  publications: (
    <Icon d="M4 2.5h8l4 4V17.5a1 1 0 01-1 1H4a1 1 0 01-1-1V3.5a1 1 0 011-1zM12 2.5v4h4M6.5 10h7M6.5 13h5" />
  ),
  events: (
    <Icon d="M5.5 2.5v2M14.5 2.5v2M2.5 7.5h15M3.5 2.5h13a1 1 0 011 1V17.5a1 1 0 01-1 1h-13a1 1 0 01-1-1V3.5a1 1 0 011-1zM7 11.5h.01M10 11.5h.01M13 11.5h.01M7 14.5h.01" />
  ),
  videos: (
    <Icon d="M3 4.5h14a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1zM8 8l4.5 3L8 14z" />
  ),
  lecturers: (
    <Icon d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 17.5c0-3.04 3.13-5.5 7-5.5s7 2.46 7 5.5" />
  ),
  experts: (
    <Icon d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 17.5c0-3.04 3.13-5.5 7-5.5s7 2.46 7 5.5M13.5 5.5l1.5 1.5 2.5-2.5" />
  ),
  students: (
    <Icon d="M4 16.5c2-2.5 4-3.5 6-3.5s4 1 6 3.5M10 9.5a3 3 0 100-6 3 3 0 000 6z" />
  ),
  alumni: (
    <Icon d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 17.5c0-3.04 3.13-5.5 7-5.5s7 2.46 7 5.5M13 6l2 2 3-3" />
  ),
  "public-service": (
    <Icon d="M3.5 4.5h13v12h-13zM7 2.5v4M13 2.5v4M2.5 8.5h15" />
  ),
  partners: (
    <Icon d="M10 17.5v-6l-4-2.5M10 11.5l4-2.5M3 4.5l7 3 7-3v9l-7 3-7-3z" />
  ),
  tracking: <Icon d="M10 17.5a7.5 7.5 0 100-15 7.5 7.5 0 000 15zM10 5v5l3 2" />,
};

const navigationGroups = [
  { label: "Overview", items: [["Dashboard", "/dashboard", "dashboard"]] },
  {
    label: "Content",
    items: [
      ["Homepage", "/dashboard/content/homepage", "homepage"],
      ["About", "/dashboard/content/about", "about"],
      ["Contact", "/dashboard/content/contact", "contact"],
      ["Footer", "/dashboard/content/footer", "footer"],
    ],
  },
  {
    label: "Research & Work",
    items: [
      ["Research Areas", "/dashboard/research", "research"],
      ["Research Highlights", "/dashboard/research-highlights", "highlights"],
      ["Publications", "/dashboard/publications", "publications"],
      ["Events", "/dashboard/events", "events"],
      ["Videos", "/dashboard/videos", "videos"],
    ],
  },
  {
    label: "People",
    items: [
      ["Lecturers", "/dashboard/dosen", "lecturers"],
      ["Experts", "/dashboard/experts", "experts"],
      ["Students", "/dashboard/students", "students"],
      ["Alumni", "/dashboard/alumni", "alumni"],
    ],
  },
  {
    label: "Ecosystem",
    items: [
      ["Public Service", "/dashboard/public-service", "public-service"],
      ["Partners", "/dashboard/partners", "partners"],
    ],
  },
  {
    label: "System",
    items: [["Tracking", "/dashboard/tracking", "tracking"]],
  },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[var(--rams-charcoal)] text-white lg:flex">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="relative h-10 w-12 shrink-0 rounded-sm bg-white p-1">
            <Image
              src={assetPath("/assets/rams-logo.png")}
              alt="RAMS Laboratory"
              fill
              sizes="48px"
              className="object-contain p-1"
            />
          </span>
          <div className="min-w-0 border-l-2 border-[var(--rams-red)] pl-3">
            <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/40">
              Research
            </p>
            <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.14em] text-white/40">
              &amp; Academic
            </p>
            <p className="mt-0.5 text-xs font-semibold text-white/75">
              Management
            </p>
          </div>
        </div>
      </div>

      <nav
        className="hide-scrollbar flex-1 overflow-y-auto px-3 py-4"
        aria-label="Dashboard navigation"
      >
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter(([, href]) =>
            href === "/dashboard"
              ? hasPermission(user?.role, "dashboard.read")
              : href === "/dashboard/publications"
                ? hasPermission(user?.role, "publication.read")
                : href === "/dashboard/research-highlights"
                  ? user?.role === "ADMIN"
                  : user?.role === "ADMIN" || user?.role === "DOSEN",
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} className="mt-5 first:mt-0">
              <p className="mb-1.5 px-3 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/30">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map(([label, href, icon]) => {
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/55 hover:bg-white/5 hover:text-white/85"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-150 ${
                          active
                            ? "text-[var(--rams-red)]"
                            : "text-white/35 group-hover:text-white/55"
                        }`}
                      >
                        {ICONS[icon] ?? null}
                      </span>
                      <span className="truncate">{label}</span>
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rams-red)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <footer className="border-t border-white/10 px-5 py-4">
        <p className="text-[0.7rem] text-white/40">
          Signed in as{" "}
          <span className="font-semibold text-white/65">{user?.role}</span>
        </p>
      </footer>
    </aside>
  );
}
