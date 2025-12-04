// app/api/leagues/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/**
 * Allgemeiner API-Football Fetch Wrapper
 */
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
    // Ligen sollen immer frisch sein
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football error ${res.status}: ${text}`);
  }

  return res.json();
}

type ApiLeagueItem = {
  league: {
    id: number;
    name: string;
    type?: string;
    logo?: string | null;
  };
  country?: {
    name?: string;
    code?: string | null;
    flag?: string | null;
  };
};

/**
 * GET /api/leagues?season=2025&country=Germany (country optional)
 */
export async function GET(req: NextRequest) {
  try {
    // Wichtig: nextUrl statt new URL(req.url), damit es mit dynamic=force-dynamic passt
    const searchParams = req.nextUrl.searchParams;
    const season = searchParams.get("season") || "2025";
    const countryFilter = searchParams.get("country"); // optional

    const json = await apiFootballFetch("/leagues", { season });

    const items: ApiLeagueItem[] = Array.isArray(json.response)
      ? json.response
      : [];

    const leagues = items
      .filter((item) => item.league && item.league.id)
      .filter((item) => {
        if (!countryFilter) return true;
        const c = item.country?.name || "";
        return c.toLowerCase() === countryFilter.toLowerCase();
      })
      // nur klassische Ligen (keine Cups) – kann man später anpassen
      .filter((item) => !item.league.type || item.league.type === "League")
      .map((item) => ({
        id: item.league.id,
        name: item.league.name,
        country: item.country?.name || "Unbekannt",
        type: item.league.type || null,
        logo: item.league.logo || null,
      }));

    leagues.sort((a, b) => {
      if (a.country === b.country) return a.name.localeCompare(b.name);
      return a.country.localeCompare(b.country);
    });

    return NextResponse.json(leagues, { status: 200 });
  } catch (error: any) {
    console.error("❌ /api/leagues error:", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: "leagues failed", message: error?.message },
      { status: 500 }
    );
  }
}
