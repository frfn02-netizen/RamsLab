import type { Metadata } from "next";
import type { ReactNode } from "react";

import MeetingsWorkspaceGuard from "@/components/meetings-workspace/workspace-guard";
import MeetingsWorkspaceShell from "@/components/meetings-workspace/workspace-shell";

export const metadata: Metadata = {
  title: "Meetings workspace",
  robots: { index: false, follow: false },
};

export default function MeetingsWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <MeetingsWorkspaceGuard>
      <MeetingsWorkspaceShell>{children}</MeetingsWorkspaceShell>
    </MeetingsWorkspaceGuard>
  );
}
