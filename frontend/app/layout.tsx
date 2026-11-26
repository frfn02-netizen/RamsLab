import type { ReactNode } from "react";

import { rootMetadata } from "@/lib/root-metadata";

export const metadata = rootMetadata;

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
