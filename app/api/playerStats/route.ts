// app/api/playerStats/route.ts
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
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
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

type ApiStatsResponse = {
  player: {
    id: number;
    name: string;
    nationality?: string;
    photo?: string | null;
  };
  statistics: Array<{
    team?: { name?: string | null };
    league?: { name?: string | null; country?: string | null; season?: number };
    games?: {
      appearences?: number | null;
      minutes?: number | null;
      position?: string | null;
      rating?: string | null;
    };
    goals?: { total?: number | null; assists?: number | null };
    passes?: { accuracy?: string | number | null };
  }>;
};

/**
 * GET /api/playerStats?id=API_PLAYER_ID&season=2025
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const season = searchParams.get("season") || "2025";

    if (!id) {
      return NextResponse.json(
        { error: "id (API-Player-ID) required" },
        { status: 400 }
      );
    }

    const json = await apiFootballFetch("/players", {
      id,
      season,
    });

    const item: ApiStatsResponse | undefined = Array.isArray(json.response)
      ? json.response[0]
      : undefined;

    if (!item) {
      return NextResponse.json(
        { error: "no data for this player / season" },
        { status: 404 }
      );
    }

    const baseStats = item.statistics?.[0] ?? {};

    // Rating kommt als String "6.8" → Zahl
    let rating: number | null = null;
    if (baseStats.games?.rating) {
      const parsed = parseFloat(baseStats.games.rating);
      rating = isNaN(parsed) ? null : parsed;
    }

    // Passgenauigkeit kann "85%" oder Zahl sein
    let passAccuracy: number | null = null;
    if (typeof baseStats.passes?.accuracy === "string") {
      const cleaned = baseStats.passes.accuracy.replace("%", "");
      const parsed = parseFloat(cleaned);
      passAccuracy = isNaN(parsed) ? null : parsed;
    } else if (typeof baseStats.passes?.accuracy === "number") {
      passAccuracy = baseStats.passes.accuracy;
    }

    const result = {
      player: {
        apiId: item.player.id,
        name: item.player.name,
        nationality: item.player.nationality ?? null,
        photo: item.player.photo ?? null,
      },
      stats: {
        club: baseStats.team?.name ?? null,
        league: baseStats.league?.name ?? null,
        country: baseStats.league?.country ?? null,
        season: baseStats.league?.season ?? null,
        position: baseStats.games?.position ?? null,
        appearances: baseStats.games?.appearences ?? null,
        minutes: baseStats.games?.minutes ?? null,
        goals: baseStats.goals?.total ?? null,
        assists: baseStats.goals?.assists ?? null,
        rating,
        passAccuracy,
      },
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("❌ /api/playerStats error:", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: "playerStats failed", message: error?.message },
      { status: 500 }
    );
  }
}