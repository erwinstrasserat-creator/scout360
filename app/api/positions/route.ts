// app/api/positions/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/**
 * Kleiner Wrapper für API-Football Requests
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
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API-Football error ${res.status}: ${txt}`);
  }

  return res.json();
}

/**
 * GET /api/positions?season=2025
 *
 * Holt eine Liste der tatsächlich von API-Football gelieferten Positionen.
 * Wir nehmen dafür einfach eine Beispiel-Liga (Premier League: 39),
 * weil die Positionsliste global gleich ist.
 */
export async function GET(req: NextRequest) {
  try {
    const season =
      Number(req.nextUrl.searchParams.get("season")) || new Date().getFullYear();

    // Beispiel-Liga: Premier League (ID 39)
    const json = await apiFootballFetch("/players", {
      league: 39,
      season,
      page: 1,
    });

    const items: any[] = Array.isArray(json.response) ? json.response : [];

    const set = new Set<string>();
    for (const item of items) {
      const stat = Array.isArray(item.statistics) ? item.statistics[0] : null;
      const pos = stat?.games?.position;
      if (typeof pos === "string" && pos.trim()) {
        set.add(pos.trim());
      }
    }

    // Fallback, falls API etwas Komisches zurückgibt
    if (set.size === 0) {
      ["Goalkeeper", "Defender", "Midfielder", "Attacker"].forEach((p) =>
        set.add(p)
      );
    }

    const positions = Array.from(set).sort((a, b) => a.localeCompare(b));

    return NextResponse.json(positions, { status: 200 });
  } catch (error: any) {
    console.error("❌ /api/positions error:", error);

    // Fallback: fixe, API-konforme Liste
    const fallback = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];

    return NextResponse.json(fallback, { status: 200 });
  }
}