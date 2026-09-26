import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const PRIVATE_PREFIXES = [
  "/api",
  "/dashboard",
  "/admin",
  "/login",
  "/profile",
  "/change-password",
];

const PRIVATE_ALUMNI_PATHS = [
  "/alumni",
  "/alumni/login",
  "/alumni/register",
  "/alumni/dashboard",
  "/alumni/history",
];

const RAMS_LAB_PREFIX = "/rams-lab";
const BASE_PATH = process.env.BASE_PATH || "";

const intlMiddleware = createMiddleware(routing);

function hasPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// With `trailingSlash: true` (used by the /rams-lab deployment) Next.js hands
// the proxy "/alumni/register/", which must still match "/alumni/register".
function stripTrailingSlash(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function rewriteRamsLab(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const suffix =
    pathname === RAMS_LAB_PREFIX ? "" : pathname.slice(RAMS_LAB_PREFIX.length);

  const normalizedSuffix = suffix || "";

  const isIndonesian =
    normalizedSuffix === "/id" || normalizedSuffix.startsWith("/id/");

  if (isIndonesian) {
    url.pathname = normalizedSuffix;
  } else {
    url.pathname = `/en${normalizedSuffix}`;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-rams-lab", "1");

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  });
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPathname = stripTrailingSlash(pathname);

  /*
   * When Next.js is built with:
   *
   *   BASE_PATH=/rams-lab
   *
   * Next.js natively owns the /rams-lab prefix.
   *
   * Do NOT manually rewrite /rams-lab -> /en here.
   */
  const isNativeRamsLabMode = BASE_PATH === RAMS_LAB_PREFIX;

  if (!isNativeRamsLabMode && hasPrefix(pathname, RAMS_LAB_PREFIX)) {
    return rewriteRamsLab(request);
  }

  if (PRIVATE_PREFIXES.some((prefix) => hasPrefix(pathname, prefix))) {
    return NextResponse.next();
  }

  if (PRIVATE_ALUMNI_PATHS.includes(normalizedPathname)) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
