import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const protectedPaths = [
    "/admin",
    "/admin/players",
    "/admin/clubs",
    "/admin/users",
    "/admin/reports",
    "/admin/needs",
  ];

  // Nur wenn Pfad geschützt
  if (protectedPaths.some((p) => path.startsWith(p))) {
    const isLoggedIn = req.cookies.get("auth")?.value;

    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};