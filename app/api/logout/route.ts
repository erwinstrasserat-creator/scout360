import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Auth-Zugriff entfernen
  res.cookies.set("auth", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  // Rolle entfernen, falls gesetzt
  res.cookies.set("role", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });

  return res;
}