import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token } = await req.json();

  const res = NextResponse.json({ ok: true });

  res.cookies.set("auth", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}