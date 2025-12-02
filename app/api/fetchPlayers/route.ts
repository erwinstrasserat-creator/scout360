import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

async function apiFootballFetch(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY fehlt in .env.local");

  const url = new URL(API_FOOTBALL_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
  });

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { error: true, raw: text };
  }
}

function parseHeightToCm(height?: string | null): number | null {
  if (!height) return null;
  const n = parseInt(height);
  return isNaN(n) ? null : n;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const season = Number(body.season) || 2025;
    const leagueIds = Array.isArray(body.leagueIds)
      ? body.leagueIds.map((x) => Number(x))
      : [];

    if (!leagueIds.length) {
      return NextResponse.json({ error: "leagueIds required" }, { status: 400 });
    }

    const allPlayers: any[] = [];
    const playerCache = new Set<number>();
    const debug: any[] = [];

    for (const league of leagueIds) {
      debug.push({ step: "league-start", league });

      const teamsJson = await apiFootballFetch("/teams", {
        league,
        season,
      });

      debug.push({
        step: "teams-response",
        league,
        teamCount: teamsJson.response?.length,
        paging: teamsJson.paging,
        rawError: teamsJson.error ? teamsJson : undefined,
      });

      const teams = Array.isArray(teamsJson.response)
        ? teamsJson.response
        : [];

      for (const t of teams) {
        const teamId = t.team?.id;
        if (!teamId) continue;

        let page = 1;

        while (page <= 10) {
          const playersJson = await apiFootballFetch("/players", {
            team: teamId,
            season,
            page,
          });

          debug.push({
            step: "players-response",
            league,
            teamId,
            page,
            responseCount: playersJson.response?.length,
            paging: playersJson.paging,
            rawError: playersJson.error ? playersJson : undefined,
          });

          const arr = Array.isArray(playersJson.response)
            ? playersJson.response
            : [];

          if (!arr.length) break;

          for (const item of arr) {
            const p = item.player;
            const s = item.statistics?.[0];

            if (!p?.id) continue;
            if (playerCache.has(p.id)) continue;
            playerCache.add(p.id);

            allPlayers.push({
              apiId: p.id,
              name: p.name,
              age: p.age ?? null,
              heightCm: parseHeightToCm(p.height),
              position: s?.games?.position ?? null,
              foot: p.preferred_foot ?? null,
              league: s?.league?.name ?? null,
              club: s?.team?.name ?? null,
              onLoan: false,
              loanFrom: null,
              stats: {},
              traits: [],
            });
          }

          if (!playersJson.paging || page >= playersJson.paging.total) break;
          page++;
        }
      }
    }

    return NextResponse.json(
      {
        debug,
        playerCount: allPlayers.length,
        players: allPlayers,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}