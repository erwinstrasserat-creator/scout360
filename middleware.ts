import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nur Admin-Routen schützen (alles unter /admin)
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const auth = req.cookies.get("auth")?.value;
  const role = req.cookies.get("role")?.value;

  // Nicht eingeloggt → zum Login
  if (!auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Eingeloggt, aber keine Admin-Rolle → Startseite
  if (role !== "admin") {
    const homeUrl = new URL("/", req.url);
    return NextResponse.redirect(homeUrl);
  }

  // Admin + eingeloggt → Zugriff erlaubt
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};