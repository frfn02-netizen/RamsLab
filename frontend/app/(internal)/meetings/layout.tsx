import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import MeetingsWorkspaceGuard from "@/components/meetings-workspace/workspace-guard";
import MeetingsWorkspaceShell from "@/components/meetings-workspace/workspace-shell";
import { getMeetingsSession } from "@/lib/server-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Meetings workspace",
  robots: { index: false, follow: false },
};

export default async function MeetingsWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getMeetingsSession();

  if (session.status === "unauthenticated") {
    redirect(`/login?callbackUrl=${encodeURIComponent("/meetings")}`);
  }

  if (session.status === "forbidden") {
    redirect(
      session.role === "ALUMNI" ? "/dashboard/alumni/profile" : "/dashboard",
    );
  }

  return (
    <MeetingsWorkspaceGuard>
      <MeetingsWorkspaceShell>{children}</MeetingsWorkspaceShell>
    </MeetingsWorkspaceGuard>
  );
}
