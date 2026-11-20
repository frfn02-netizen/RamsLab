"use client";

import { useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { useRouter as useNextRouter } from "next/navigation";
import { getPathname } from "@/i18n/navigation";
import { useRamsLabNavigation } from "./rams-lab-navigation-provider";
import type { Locale } from "@/i18n/routing";

const RAMS_LAB_PREFIX = "/rams-lab";

type IntlRouter = ReturnType<typeof useNextRouter>;

type NavigationHref = Parameters<IntlRouter["push"]>[0];

type NavigationOptions = Parameters<IntlRouter["push"]>[1];

function stripRamsLabPrefix(pathname: string) {
  if (pathname === RAMS_LAB_PREFIX) {
    return "/";
  }

  if (pathname.startsWith(`${RAMS_LAB_PREFIX}/`)) {
    return pathname.slice(RAMS_LAB_PREFIX.length) || "/";
  }

  return pathname;
}

function prefixRamsLabPath(pathname: string, enabled: boolean) {
  if (!enabled) {
    return pathname;
  }

  if (
    pathname === RAMS_LAB_PREFIX ||
    pathname.startsWith(`${RAMS_LAB_PREFIX}/`)
  ) {
    return pathname;
  }

  if (!pathname.startsWith("/")) {
    return pathname;
  }

  return pathname === "/" ? RAMS_LAB_PREFIX : `${RAMS_LAB_PREFIX}${pathname}`;
}

export function useRamsLabRouter() {
  const router = useNextRouter();
  const currentLocale = useLocale() as Locale;
  const isRamsLab = useRamsLabNavigation();

  const buildPath = useCallback(
    (href: NavigationHref, targetLocale?: Locale) => {
      const locale = targetLocale ?? currentLocale;

      const normalizedHref =
        typeof href === "string" ? stripRamsLabPrefix(href) : href;

      const localizedPath = getPathname({
        href: normalizedHref,
        locale,
        forcePrefix:
          targetLocale != null
            ? targetLocale !== routing.defaultLocale
            : undefined,
      });

      return prefixRamsLabPath(localizedPath, isRamsLab);
    },
    [currentLocale, isRamsLab],
  );

  return useMemo(
    () => ({
      ...router,

      push(
        href: NavigationHref,
        options?: NavigationOptions & { locale?: Locale },
      ) {
        const { locale, ...nextOptions } = options ?? {};

        return router.push(buildPath(href, locale), nextOptions);
      },

      replace(
        href: NavigationHref,
        options?: NavigationOptions & { locale?: Locale },
      ) {
        const { locale, ...nextOptions } = options ?? {};

        return router.replace(buildPath(href, locale), nextOptions);
      },

      prefetch(href: NavigationHref) {
        return router.prefetch(buildPath(href));
      },
    }),
    [router, buildPath],
  );
}
