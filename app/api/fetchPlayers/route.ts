// app/api/fetchPlayers/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/* ---------------------------------------------------------
   🔵 API Helper
--------------------------------------------------------- */
async function apiFootballFetch(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt in .env.local");
  }

  const url = new URL(API_FOOTBALL_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  console.log("🔵 FETCH:", url.toString());

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ API Error:", text);
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

/* ---------------------------------------------------------
   🔵 HEIGHT PARSER
--------------------------------------------------------- */
function parseHeightToCm(height: string | null | undefined): number | null {
  if (!height) return null;
  const n = parseInt(height);
  return isNaN(n) ? null : n;
}

/* ---------------------------------------------------------
   🔵 LOAN DETECTOR
--------------------------------------------------------- */
function extractLoanInfo(transfers: any[]) {
  if (!Array.isArray(transfers)) return { onLoan: false, loanFrom: null };

  for (const t of transfers) {
    if (typeof t.type === "string" && t.type.toLowerCase().includes("loan")) {
      return {
        onLoan: true,
        loanFrom: t.teams?.in?.name ?? null,
      };
    }
  }
  return { onLoan: false, loanFrom: null };
}

/* ---------------------------------------------------------
   🔵 MAIN POST ENDPOINT
--------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const season = Number(body.season) || 2025;

    const leagueIds: number[] = Array.isArray(body.leagueIds)
      ? body.leagueIds.map((x) => Number(x)).filter((x) => !isNaN(x))
      : [];

    if (!leagueIds.length) {
      return NextResponse.json(
        { error: "leagueIds required" },
        { status: 400 }
      );
    }

    console.log("🔵 IMPORT START – Season:", season, "Leagues:", leagueIds);

    const allPlayers: any[] = [];
    const playerCache = new Set<number>(); // prevent duplicates

    /* ---------------------------------------------------------
       🔵 FOR EACH LEAGUE → LOAD TEAMS
    --------------------------------------------------------- */
    for (const leagueId of leagueIds) {
      console.log("➡️ Lade Teams aus Liga:", leagueId);

      const teamsJson = await apiFootballFetch("/teams", {
        league: leagueId,
        season,
      });

      const teams = Array.isArray(teamsJson.response)
        ? teamsJson.response
        : [];

      const teamIds = teams
        .map((t) => t.team?.id)
        .filter((id) => typeof id === "number");

      console.log(`   ✔️ ${teamIds.length} Teams gefunden.`);

      /* ---------------------------------------------------------
         🔵 FOR EACH TEAM → PLAYERS
      --------------------------------------------------------- */
      for (const teamId of teamIds) {
        console.log("   ➡️ Lade Spieler Team:", teamId);

        let page = 1;
        const maxPages = 10; // safety

        while (page <= maxPages) {
          const playersJson = await apiFootballFetch("/players", {
            team: teamId,
            season,
            page,
          });

          const playersArr = Array.isArray(playersJson.response)
            ? playersJson.response
            : [];

          if (!playersArr.length) break;

          console.log(
            `      ✔️ Seite ${page} – ${playersArr.length} Spieler`
          );

          for (const item of playersArr) {
            const p = item.player;
            const stats = Array.isArray(item.statistics)
              ? item.statistics[0]
              : null;

            if (!p?.id) continue;
            if (playerCache.has(p.id)) continue;

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

              // 🔵 Loan support
              onLoan: loan.onLoan,
              loanFrom: loan.loanFrom,

              // Placeholder stats
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

          if (!playersJson.paging) break;
          if (page >= playersJson.paging.total) break;

          page++;
        }
      }
    }

    console.log(`🎉 IMPORT FERTIG – ${allPlayers.length} Spieler geladen.`);
    return NextResponse.json(allPlayers, { status: 200 });
  } catch (error: any) {
    console.error("❌ fetchPlayers error:", error);
    return NextResponse.json(
      {
        error: "fetchPlayers failed",
        message: error?.message,
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}