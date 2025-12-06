// app/api/leagues/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/**
 * API-Football Fetch Wrapper
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
    // absolut sicher: niemals cachen
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * GET /api/leagues?season=2025
 * Liefert eine stabilisierte, gecleante Ligenliste.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const season = searchParams.get("season") || "2025";

    // API-Football liefert oft zu viele oder chaotische Einträge.
    // Wir normalisieren sauber und lassen Cups NICHT mehr rausfallen.
    const json = await apiFootballFetch("/leagues", { season });

    const items = Array.isArray(json.response) ? json.response : [];

    const leagues = items
      .map((item) => ({
        id: item.league?.id ?? null,
        name: item.league?.name ?? "Unbekannt",
        type: item.league?.type ?? null,
        country: item.country?.name ?? "International",
        logo: item.league?.logo ?? null,
      }))
      // nur gültige IDs
      .filter((l) => typeof l.id === "number")
      // manche Einträge enthalten komplett leere Ligen
      .filter((l) => l.name && l.name !== "");

    // Sortierung nach Land + Name
    leagues.sort((a, b) => {
      if (a.country === b.country) return a.name.localeCompare(b.name);
      return a.country.localeCompare(b.country);
    });

    // HARD CACHE DISABLE – Vercel darf das nicht speichern
    return new NextResponse(JSON.stringify(leagues), {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("❌ /api/leagues error:", error);

    return NextResponse.json(
      { error: "leagues failed", message: error?.message },
      { status: 500 }
    );
  }
}