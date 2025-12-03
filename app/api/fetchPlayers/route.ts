// app/api/fetchPlayers/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/* ----------------------------------------------------
   API Wrapper
---------------------------------------------------- */
async function apiFootballFetch(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt in .env.local oder bei Vercel!");
  }

  const url = new URL(API_FOOTBALL_BASE + path);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football error ${res.status}: ${text}`);
  }

  return res.json();
}

/* ----------------------------------------------------
   Helper
---------------------------------------------------- */
function parseHeightToCm(height: string | undefined | null): number | null {
  if (!height) return null;

  // API liefert z.B. "182 cm" oder "182"
  const parsed = parseInt(height.replace("cm", "").trim());
  return isNaN(parsed) ? null : parsed;
}

function extractLoanInfo(transfers: any[]): {
  onLoan: boolean;
  loanFrom: string | null;
} {
  if (!Array.isArray(transfers)) return { onLoan: false, loanFrom: null };

  for (const t of transfers) {
    const type = t.type?.toLowerCase() ?? "";

    if (type.includes("loan") || type.includes("loan transfer")) {
      return {
        onLoan: true,
        loanFrom: t.teams?.in?.name ?? null,
      };
    }
  }

  return { onLoan: false, loanFrom: null };
}

/* ----------------------------------------------------
   POST – Hauptlogik
---------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const season = Number(body.season) || 2025;

    const leagueIds: number[] = Array.isArray(body.leagueIds)
      ? body.leagueIds.map((n) => Number(n))
      : [];

    if (!leagueIds.length) {
      return NextResponse.json(
        { error: "leagueIds required" },
        { status: 400 }
      );
    }

    const allPlayers: any[] = [];
    const cache = new Set<number>();

    /* ----------------------------------------------------
       1) Ligen → Teams holen
    ---------------------------------------------------- */
    for (const leagueId of leagueIds) {
      const teamsJson = await apiFootballFetch("/teams", {
        league: leagueId,
        season,
      });

      const teams = Array.isArray(teamsJson.response)
        ? teamsJson.response
        : [];

      const teamIds = teams
        .map((t: any) => t.team?.id)
        .filter((x: any) => typeof x === "number");

      /* ----------------------------------------------------
         2) Teams → Spieler paginiert holen
      ---------------------------------------------------- */
      for (const teamId of teamIds) {
        let page = 1;

        while (true) {
          const playersJson = await apiFootballFetch("/players", {
            team: teamId,
            season,
            page,
          });

          const arr = Array.isArray(playersJson.response)
            ? playersJson.response
            : [];

          if (!arr.length) break;

          for (const item of arr) {
            const p = item.player;
            const stats = Array.isArray(item.statistics)
              ? item.statistics[0]
              : null;

            if (!p?.id || cache.has(p.id)) continue;
            cache.add(p.id);

            /* Loan-Infos */
            const loan = extractLoanInfo(p.transfers ?? []);

            /* ----------------------------------------------------
               Spielerobjekt passend zur Seed-Page
            ---------------------------------------------------- */
            const playerObj = {
              apiId: p.id,
              name: p.name ?? null,
              age: p.age ?? null,
              heightCm: parseHeightToCm(p.height),

              position: stats?.games?.position ?? null,
              foot: p.preferred_foot ?? null,

              league: stats?.league?.name ?? null,
              club: stats?.team?.name ?? null,

              onLoan: loan.onLoan,
              loanFrom: loan.loanFrom,

              marketValue: null,

              stats: {
                offensiv: null,
                defensiv: null,
                intelligenz: null,
                physis: null,
                technik: null,
                tempo: null,
              },

              traits: [],
            };

            allPlayers.push(playerObj);
          }

          // Pagination Ende?
          if (!playersJson.paging) break;
          if (page >= playersJson.paging.total) break;

          page++;
        }
      }
    }

    return NextResponse.json(allPlayers, { status: 200 });
  } catch (err: any) {
    console.error("❌ fetchPlayers error:", err);

    return NextResponse.json(
      {
        error: "fetchPlayers failed",
        message: err?.message,
      },
      { status: 500 }
    );
  }
}