"use client";

import { Link as IntlLink } from "@/i18n/navigation";
import { useRamsLabNavigation } from "./rams-lab-navigation-provider";
import type { ComponentProps } from "react";

const RAMS_LAB_PREFIX = "/rams-lab";

type Props = ComponentProps<typeof IntlLink>;

function prefixHref(href: Props["href"]): Props["href"] {
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

export default function RamsLabLink(props: Props) {
  const isRamsLab = useRamsLabNavigation();

  if (!isRamsLab) {
    return <IntlLink {...props} />;
  }

  return <IntlLink {...props} href={prefixHref(props.href)} />;
}
