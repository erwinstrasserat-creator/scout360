import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nur Admin schützen
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const auth = req.cookies.get("auth")?.value || null;
  const role = req.cookies.get("role")?.value || null;

  // Nicht eingeloggt → Login
  if (!auth) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Nicht Admin → Home
  if (role !== "admin") {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

// WICHTIG: hier KEIN runtime!!
export const config = {
  matcher: ["/admin/:path*"],
};
