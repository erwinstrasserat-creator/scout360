// app/api/fetchPlayers/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/* ─────────────────────────────────────────────── */
/* Helper: API Request Wrapper                     */
/* ─────────────────────────────────────────────── */

async function apiFootballFetch(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY fehlt");

  const url = new URL(API_FOOTBALL_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API error ${res.status}: ${txt}`);
  }

  return res.json();
}

/* ─────────────────────────────────────────────── */
/* Helpers                                         */
/* ─────────────────────────────────────────────── */

const num = (v: any) => (isNaN(Number(v)) ? 0 : Number(v));
const clamp100 = (x: number) => Math.max(0, Math.min(100, isFinite(x) ? x : 0));

function parseHeightToCm(h: string | null | undefined): number | null {
  if (!h) return null;
  const n = parseInt(h);
  return isNaN(n) ? null : n;
}

const per90 = (value: number, minutes: number) =>
  minutes > 0 ? (value * 90) / minutes : 0;

const normalizeRatePer90 = (v: number, top: number) =>
  top > 0 ? clamp100((v / top) * 100) : 0;

const normalizePercent = (value: number) =>
  value <= 1 ? clamp100(value * 100) : clamp100(value);

function avg(values: number[]): number {
  const valid = values.filter((v) => v > 0);
  if (!valid.length) return 0;
  return clamp100(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function extractLoanInfo(transfers: any[]) {
  if (!Array.isArray(transfers)) return { onLoan: false, loanFrom: null };

  for (const t of transfers) {
    if (
      typeof t.type === "string" &&
      t.type.toLowerCase().includes("loan")
    ) {
      return {
        onLoan: true,
        loanFrom: t.teams?.in?.name ?? null,
      };
    }
  }

  return { onLoan: false, loanFrom: null };
}

/* ─────────────────────────────────────────────── */
/* Scouting Stats = 0–100 Werte                    */
/* ─────────────────────────────────────────────── */

function buildScoutingStats(stat: any | null) {
  if (!stat)
    return {
      offensiv: 0,
      defensiv: 0,
      intelligenz: 0,
      physis: 0,
      technik: 0,
      tempo: 0,
    };

  const games = stat.games || {};
  const goals = stat.goals || {};
  const shots = stat.shots || {};
  const passes = stat.passes || {};
  const tackles = stat.tackles || {};
  const duels = stat.duels || {};
  const dribbles = stat.dribbles || {};
  const fouls = stat.fouls || {};
  const cards = stat.cards || {};

  const minutes = num(games.minutes) || num(games.appearences) * 60;

  const g90 = per90(num(goals.total), minutes);
  const a90 = per90(num(goals.assists), minutes);
  const shotsOn90 = per90(num(shots.on), minutes);
  const kp90 = per90(num(passes.key), minutes);

  const tackles90 = per90(num(tackles.total), minutes);
  const inter90 = per90(num(tackles.interceptions), minutes);

  const duelsTotal = num(duels.total);
  const duelsWon = num(duels.won);
  const duelsWon90 = per90(duelsWon, minutes);
  const duels90 = per90(duelsTotal, minutes);

  const dribAttempts = num(dribbles.attempts);
  const dribSuccess = num(dribbles.success);
  const dribbleSuccessRate =
    dribAttempts > 0 ? dribSuccess / dribAttempts : 0;

  const passAcc = num(passes.accuracy);

  const cardsPer90 = per90(num(cards.yellow) + num(cards.red) * 2, minutes);
  const discipline = clamp100(100 - normalizeRatePer90(cardsPer90, 0.8));

  return {
    offensiv: avg([
      normalizeRatePer90(g90, 0.8),
      normalizeRatePer90(a90, 0.6),
      normalizeRatePer90(shotsOn90, 3),
      normalizeRatePer90(kp90, 2),
      normalizePercent(dribbleSuccessRate),
    ]),

    defensiv: avg([
      normalizeRatePer90(tackles90, 4),
      normalizeRatePer90(inter90, 3),
      normalizeRatePer90(duelsWon90, 8),
    ]),

    intelligenz: avg([
      normalizeRatePer90(kp90, 2.5),
      normalizePercent(passAcc),
      discipline,
    ]),

    physis: avg([
      normalizeRatePer90(duels90, 15),
      normalizeRatePer90(per90(num(fouls.committed), minutes), 3),
    ]),

    technik: avg([
      normalizePercent(passAcc),
      normalizePercent(dribbleSuccessRate),
      normalizeRatePer90(kp90, 2.5),
    ]),

    tempo: avg([
      normalizePercent(dribbleSuccessRate),
      normalizeRatePer90(per90(dribAttempts, minutes), 6),
      normalizeRatePer90(shotsOn90, 3),
    ]),
  };
}

/* ─────────────────────────────────────────────── */
/* Route: POST                                     */
/* ─────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const season = Number(body.season) || 2025;
    const leagueIds: number[] = Array.isArray(body.leagueIds)
      ? body.leagueIds
          .map((n: any) => Number(n))
          .filter((n) => !isNaN(n))
      : [];

    if (!leagueIds.length) {
      return NextResponse.json(
        { error: "leagueIds required" },
        { status: 400 }
      );
    }

    const allPlayers: any[] = [];
    const playerCache = new Set<number>();

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
        .filter((id) => typeof id === "number");

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
            if (playerCache.has(p.id)) continue;
            playerCache.add(p.id);

            const loan = extractLoanInfo(p.transfers ?? []);
            const scoutingStats = buildScoutingStats(stats);

            const rawFoot = (p.preferred_foot || "").toLowerCase();
            let normalizedFoot: string | null = null;
            if (rawFoot.includes("right")) normalizedFoot = "right";
            else if (rawFoot.includes("left")) normalizedFoot = "left";
            else if (rawFoot.includes("both")) normalizedFoot = "both";

            const playerObj = {
              apiId: p.id,
              apiTeamId: stats?.team?.id ?? null,

              name: p.name ?? null,
              age: p.age ?? null,
              nationality: p.nationality ?? null,
              heightCm: parseHeightToCm(p.height),

              position: stats?.games?.position ?? null,
              foot: normalizedFoot,

              league: stats?.league?.name ?? null,
              club: stats?.team?.name ?? null,

              imageUrl: p.photo ?? null,

              onLoan: loan.onLoan,
              loanFrom: loan.loanFrom,

              stats: scoutingStats,

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

    return NextResponse.json(allPlayers, { status: 200 });
  } catch (err: any) {
    console.error("❌ fetchPlayers error", err);

    return NextResponse.json(
      { error: "fetchPlayers failed", message: err.message },
      { status: 500 }
    );
  }
}