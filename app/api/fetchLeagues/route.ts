// app/api/fetchLeagues/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

export async function GET() {
  try {
    const key = process.env.API_FOOTBALL_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "Missing API_FOOTBALL_KEY" },
        { status: 500 }
      );
    }

    const url = new URL(API_FOOTBALL_BASE + "/leagues");
    url.searchParams.set("current", "true");

    const res = await fetch(url.toString(), {
      headers: { "x-apisports-key": key },
    });

    if (!res.ok) {
      const txt = await res.text();
      return NextResponse.json(
        { error: "API Error", message: txt },
        { status: res.status }
      );
    }

    const data = await res.json();

    const list = Array.isArray(data.response) ? data.response : [];

    const leagues = list.map((item) => ({
      id: item.league?.id ?? null,
      name: item.league?.name ?? "",
      country: item.country?.name ?? "",
    }));

    return NextResponse.json({ leagues });
  } catch (err: any) {
    return NextResponse.json(
      { error: "fetchLeagues failed", message: err?.message },
      { status: 500 }
    );
  }
}
