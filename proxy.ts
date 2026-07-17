import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Auth-by-default request gate (Next 16 proxy convention — the successor to
// middleware.ts). Everything is private unless listed here; a new page that
// forgets its own getCurrentUser() check is still protected.
//
// This only verifies signature + expiry (no DB access in the proxy). Token
// revocation via tokenVersion, and all authorization, remain in
// getCurrentUser() on every page/action — keep those checks: server-action
// POSTs target the page's own path, so the matcher alone can't cover them.

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot",
  "/reset/", // token pages; validity checked by the page itself
  "/offline", // PWA fallback shell
  "/p/", // shared program pages; the unguessable token is the access control
  "/api/cron/", // bearer CRON_SECRET, checked in-route
  "/api/push/", // session-checked in-route (also called from the SW context)
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/" ||
    PUBLIC_PREFIXES.some(
      (p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p)
    );
  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/"))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const login = new URL("/login", request.url);
  if (pathname !== "/dashboard") login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // Skip build assets, the image optimizer, extensionless metadata routes, and
  // any path with a file extension (sw.js, favicon.ico, /kris/*.jpg, …).
  matcher: [
    "/((?!_next/static|_next/image|icon-192|icon-512|icon-maskable|apple-icon|opengraph-image|manifest\\.webmanifest|.*\\..*).*)",
  ],
};
