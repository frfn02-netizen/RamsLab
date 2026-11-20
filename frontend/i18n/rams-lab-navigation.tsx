"use client";

import {
  Link as IntlLink,
  usePathname as useIntlPathname,
} from "@/i18n/navigation";
import type { ComponentProps } from "react";

const RAMS_LAB_PREFIX = "/rams-lab";

function isRamsLabPath(pathname: string) {
  return (
    pathname === RAMS_LAB_PREFIX || pathname.startsWith(`${RAMS_LAB_PREFIX}/`)
  );
}

function addRamsLabPrefix(href: ComponentProps<typeof IntlLink>["href"]) {
  if (typeof href !== "string") {
    return href;
  }

  if (
    href.startsWith(RAMS_LAB_PREFIX) ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("#")
  ) {
    return href;
  }

  if (!href.startsWith("/")) {
    return href;
  }

  return `${RAMS_LAB_PREFIX}${href}`;
}

export function RamsLabLink(props: ComponentProps<typeof IntlLink>) {
  const pathname = useIntlPathname();

  if (!isRamsLabPath(pathname)) {
    return <IntlLink {...props} />;
  }

  return <IntlLink {...props} href={addRamsLabPrefix(props.href)} />;
}
