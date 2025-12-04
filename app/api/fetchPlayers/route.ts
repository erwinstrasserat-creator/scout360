// app/api/fetchPlayers/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/** Allgemeiner API-Football Fetch Wrapper */
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

/** Höhe in cm parsen */
function parseHeightToCm(height: string | undefined | null): number | null {
  if (!height) return null;
  const parsed = parseInt(height);
  return isNaN(parsed) ? null : parsed;
}

/** Leihstatus aus Transfers extrahieren */
function extractLoanInfo(transfers: any[]): {
  onLoan: boolean;
  loanFrom: string | null;
} {
  if (!Array.isArray(transfers)) return { onLoan: false, loanFrom: null };

  for (const t of transfers) {
    if (t.type && typeof t.type === "string") {
      if (t.type.toLowerCase().includes("loan")) {
        // Achtung: Struktur kann variieren – hier einfache Heuristik
        return {
          onLoan: true,
          loanFrom: t.teams?.in?.name ?? null,
        };
      }
    }
  }

  return { onLoan: false, loanFrom: null };
}

/**
 * POST – Spieler holen & in vereinfachtes Format bringen
 * Body: { season: number, leagueIds: number[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const season = Number(body.season) || 2025;

    const leagueIds: number[] = Array.isArray(body.leagueIds)
      ? body.leagueIds.map((n: any) => Number(n)).filter((n) => !isNaN(n))
      : [];

    if (!leagueIds.length) {
      return NextResponse.json(
        { error: "leagueIds required" },
        { status: 400 }
      );
    }

    const allPlayers: any[] = [];
    const playerCache = new Set<number>();

    // 🔁 pro Liga
    for (const leagueId of leagueIds) {
      // 1️⃣ Teams laden
      const teamsJson = await apiFootballFetch("/teams", {
        league: leagueId,
        season,
      });

      const teams = Array.isArray(teamsJson.response)
        ? teamsJson.response
        : [];

      const teamIds = teams
        .map((t: any) => t.team?.id)
        .filter((id: any) => typeof id === "number");

      // 2️⃣ Für jede Mannschaft Spieler holen
      for (const teamId of teamIds) {
        let page = 1;

        while (page <= 10) {
          const playersJson = await apiFootballFetch("/players", {
            team: teamId,
            season,
            page,
          });

          const playersArr = Array.isArray(playersJson.response)
            ? playersJson.response
            : [];

          if (!playersArr.length) break;

          for (const item of playersArr) {
            const p = item.player;
            const stats = Array.isArray(item.statistics)
              ? item.statistics[0]
              : null;

            if (!p?.id) continue;
            if (playerCache.has(p.id)) continue; // Duplikate vermeiden
            playerCache.add(p.id);

            const loan = extractLoanInfo(p.transfers ?? []);

            const playerObj = {
              apiId: p.id,
              name: p.name ?? null,
              age: p.age ?? null,
              heightCm: parseHeightToCm(p.height),
              position: stats?.games?.position ?? null,
              foot: p.preferred_foot ?? null,
              league: stats?.league?.name ?? null,
              club: stats?.team?.name ?? null,

              // Loan-Infos
              onLoan: loan.onLoan,
              loanFrom: loan.loanFrom,

              // Marktwert wird später im Admin manuell gesetzt
              marketValue: null as number | null,

              // Stats – Platzhalter
              stats: {
                offensiv: null as number | null,
                defensiv: null as number | null,
                intelligenz: null as number | null,
                physis: null as number | null,
                technik: null as number | null,
                tempo: null as number | null,
              },

              traits: [] as string[],
            };

            allPlayers.push(playerObj);
          }

          if (!playersJson.paging) break;
          if (page >= playersJson.paging.total) break;
          page++;
        }
      }
    }

    return NextResponse.json(allPlayers, { status: 200 });
  } catch (error: any) {
    console.error("❌ fetchPlayers error:", {
      message: error?.message,
      stack: error?.stack,
    });

    return NextResponse.json(
      { error: "fetchPlayers failed", message: error?.message },
      { status: 500 }
    );
  }
}