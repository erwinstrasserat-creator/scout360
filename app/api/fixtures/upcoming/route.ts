// app/api/fixtures/upcoming/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

async function apiFootballFetch(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt in .env.local / Vercel");
  }

  const url = new URL(API_FOOTBALL_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * GET /api/fixtures/upcoming?teamId=123&limit=4
 * Liefert die nächsten Spiele eines Teams im Minimalformat,
 * das in PlayerDetailPage verwendet wird.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const teamId = searchParams.get("teamId");
    const limitParam = searchParams.get("limit") ?? "4";

    if (!teamId) {
      return NextResponse.json(
        { error: "teamId ist erforderlich" },
        { status: 400 }
      );
    }

    const limit = Number(limitParam) || 4;

    const json = await apiFootballFetch("/fixtures", {
      team: teamId,
      next: limit,
    });

    const resp = Array.isArray(json.response) ? json.response : [];

    const fixtures = resp.map((item: any) => ({
      fixture: {
        id: item.fixture?.id ?? 0,
        date: item.fixture?.date ?? "",
      },
      league: {
        name: item.league?.name ?? "",
      },
      teams: {
        home: { name: item.teams?.home?.name ?? "" },
        away: { name: item.teams?.away?.name ?? "" },
      },
    }));

    return NextResponse.json(fixtures, { status: 200 });
  } catch (error: any) {
    console.error("❌ /api/fixtures/upcoming error:", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: "fixtures failed", message: error?.message },
      { status: 500 }
    );
  }
}
