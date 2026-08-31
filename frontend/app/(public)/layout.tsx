import type { ReactNode } from "react";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="public-site min-h-screen bg-[var(--paper)]">{children}</div>
  );
}
