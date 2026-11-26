import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const PRIVATE_PREFIXES = [
  "/api",
  "/dashboard",
  "/meetings",
  "/admin",
  "/login",
  "/forgot-password",
  "/reset-password",
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
const AUTH_COOKIE_NAME = "rams_access_token";

const intlMiddleware = createMiddleware(routing);

function hasPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function stripTrailingSlash(pathname: string) {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

function isMeetingsPath(pathname: string) {
  return (
    hasPrefix(pathname, "/meetings") ||
    /^\/(en|id)\/meetings(?:\/|$)/.test(pathname)
  );
}

function meetingsCallbackPath(pathname: string) {
  return pathname.replace(/^\/(en|id)(?=\/meetings(?:\/|$))/, "");
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
  const isNativeRamsLabMode = BASE_PATH === RAMS_LAB_PREFIX;

  if (!isNativeRamsLabMode && hasPrefix(pathname, RAMS_LAB_PREFIX)) {
    return rewriteRamsLab(request);
  }

  if (isMeetingsPath(pathname) && !request.cookies.has(AUTH_COOKIE_NAME)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?callbackUrl=${encodeURIComponent(
      `${meetingsCallbackPath(pathname)}${request.nextUrl.search}`,
    )}`;
    return NextResponse.redirect(loginUrl);
  }

  if (/^\/(en|id)\/meetings(?:\/|$)/.test(pathname)) {
    const meetingsUrl = request.nextUrl.clone();
    meetingsUrl.pathname = meetingsCallbackPath(pathname);
    const response = NextResponse.rewrite(meetingsUrl);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (PRIVATE_PREFIXES.some((prefix) => hasPrefix(pathname, prefix))) {
    const response = NextResponse.next();
    if (isMeetingsPath(pathname)) {
      response.headers.set("Cache-Control", "private, no-store");
    }
    return response;
  }

  if (PRIVATE_ALUMNI_PATHS.includes(normalizedPathname)) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
