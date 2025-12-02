// app/api/fetchPlayers/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

async function apiFootballFetch(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt in .env.local");
  }

  const url = new URL(API_FOOTBALL_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football error ${res.status}: ${text}`);
  }

  return res.json();
}

// Kleiner Helper, um "180 cm" → 180 zu machen
function parseHeightToCm(height: string | null | undefined): number | undefined {
  if (!height) return undefined;
  const num = parseInt(height);
  return Number.isNaN(num) ? undefined : num;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const season = Number(body.season) || 2025;
    const leagueIds: number[] = Array.isArray(body.leagueIds)
      ? body.leagueIds.map((x: any) => Number(x)).filter((x) => !Number.isNaN(x))
      : [];

    if (!leagueIds.length) {
      return NextResponse.json(
        { error: "leagueIds required" },
        { status: 400 }
      );
    }

    const allPlayers: any[] = [];

    // 1) Für jede Liga → Teams holen
    for (const leagueId of leagueIds) {
      const teamsJson = await apiFootballFetch("/teams", {
        league: leagueId,
        season,
      });

      const teams: any[] = Array.isArray(teamsJson.response)
        ? teamsJson.response
        : [];

      const teamIds: number[] = teams
        .map((t) => t.team?.id)
        .filter((id): id is number => typeof id === "number");

      // 2) Für jedes Team → Spieler holen
      for (const teamId of teamIds) {
        let page = 1;
        const maxPages = 5; // Safety-Limit

        while (page <= maxPages) {
          const playersJson = await apiFootballFetch("/players", {
            team: teamId,
            season,
            page,
          });

          const respArr: any[] = Array.isArray(playersJson.response)
            ? playersJson.response
            : [];

          if (!respArr.length) break;

          for (const r of respArr) {
            const p = r.player;
            const stat = Array.isArray(r.statistics) ? r.statistics[0] : null;

            const heightCm = parseHeightToCm(p.height);
            const position = stat?.games?.position ?? null;
            const leagueName = stat?.league?.name ?? null;

            const playerObj = {
              apiId: p.id,
              name: p.name,
              age: p.age ?? null,
              heightCm: heightCm ?? null,
              position,
              foot: p.preferred_foot ?? null,
              league: leagueName,
              club: stat?.team?.name ?? null,
              // Stats kannst du später verfeinern – hier Platzhalter/Felder
              stats: {
                offensiv: undefined,
                defensiv: undefined,
                intelligenz: undefined,
                physis: undefined,
                technik: undefined,
                tempo: undefined,
              },
              traits: [] as string[],
            };

            allPlayers.push(playerObj);
          }

          // Pagination abbrechen, wenn weniger als 20/30 zurückkommen
          if (!playersJson.paging || !playersJson.paging.total) break;
          if (page >= playersJson.paging.total) break;
          page++;
        }
      }
    }

    return NextResponse.json(allPlayers);
  } catch (err: any) {
    console.error("fetchPlayers error:", err);
    return NextResponse.json(
      { error: err?.message ?? "fetchPlayers failed" },
      { status: 500 }
    );
  }
}