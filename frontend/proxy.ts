import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const PRIVATE_PREFIXES = ["/api", "/dashboard", "/admin", "/login", "/profile"];

const intlMiddleware = createMiddleware(routing);

function hasPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PRIVATE_PREFIXES.some((prefix) => hasPrefix(pathname, prefix))) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
