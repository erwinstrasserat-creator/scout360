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

/** Safe number helper */
function num(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/** Auf 0–100 clampen */
function clamp100(x: number): number {
  if (!isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

/** Rate → 0–100 normalisieren (x pro 90 min, top = typischer Maximalwert) */
function normalizeRatePer90(valuePer90: number, top: number): number {
  if (top <= 0) return 0;
  return clamp100((valuePer90 / top) * 100);
}

/** Prozentwert (0–1 oder 0–100) → 0–100 */
function normalizePercent(value: number): number {
  if (!isFinite(value) || value <= 0) return 0;
  if (value <= 1) return clamp100(value * 100);
  return clamp100(value);
}

/** Durchschnitt aus Komponenten */
function avg(values: number[]): number {
  const valid = values.filter((v) => v > 0);
  if (!valid.length) return 0;
  return clamp100(valid.reduce((a, b) => a + b, 0) / valid.length);
}

/** inkl. Minuten → Wert pro 90 Minuten */
function per90(value: number, minutes: number): number {
  if (!minutes || minutes <= 0) return 0;
  return (value * 90) / minutes;
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
        return {
          onLoan: true,
          loanFrom: t.teams?.in?.name ?? null,
        };
      }
    }
  }

  return { onLoan: false, loanFrom: null };
}

/** Scouting-Stats 0–100 aus API-Football-Statistik berechnen */
function buildScoutingStats(stat: any | null): {
  offensiv: number | null;
  defensiv: number | null;
  intelligenz: number | null;
  physis: number | null;
  technik: number | null;
  tempo: number | null;
} {
  if (!stat) {
    return {
      offensiv: null,
      defensiv: null,
      intelligenz: null,
      physis: null,
      technik: null,
      tempo: null,
    };
  }

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

  // Basiswerte
  const g = num(goals.total);
  const a = num(goals.assists);
  const shotsTotal = num(shots.total);
  const shotsOn = num(shots.on);
  const keyPasses = num(passes.key);
  const passAcc = num(passes.accuracy); // meist 0–100
  const tacklesTotal = num(tackles.total);
  const interceptions = num(tackles.interceptions);
  const duelsTotal = num(duels.total);
  const duelsWon = num(duels.won);
  const dribAttempts = num(dribbles.attempts);
  const dribSuccess = num(dribbles.success);
  const foulsCommitted = num(fouls.committed);
  const foulsDrawn = num(fouls.drawn);
  const yellow = num(cards.yellow);
  const red = num(cards.red);

  const g90 = per90(g, minutes);
  const a90 = per90(a, minutes);
  const shotsOn90 = per90(shotsOn, minutes);
  const kp90 = per90(keyPasses, minutes);
  const tackles90 = per90(tacklesTotal, minutes);
  const inter90 = per90(interceptions, minutes);
  const duels90 = per90(duelsTotal, minutes);
  const duelsWon90 = per90(duelsWon, minutes);
  const foulsComm90 = per90(foulsCommitted, minutes);
  const foulsDrawn90 = per90(foulsDrawn, minutes);

  const dribbleSuccessRate =
    dribAttempts > 0 ? dribSuccess / dribAttempts : 0;

  const duelWinRate =
    duelsTotal > 0 ? duelsWon / duelsTotal : 0;

  // ► Offensiv
  const offensiv = avg([
    normalizeRatePer90(g90, 0.8), // 0,8 Tore / 90 = sehr gut
    normalizeRatePer90(a90, 0.6),
    normalizeRatePer90(shotsOn90, 3),
    normalizeRatePer90(kp90, 2),
    normalizePercent(dribbleSuccessRate),
  ]);

  // ► Defensiv
  const defensiv = avg([
    normalizeRatePer90(tackles90, 4),    // 4 Tackles / 90
    normalizeRatePer90(inter90, 3),
    normalizeRatePer90(duelsWon90, 8),
  ]);

  // ► Intelligenz
  // Mischung aus Key-Pässen, Passqualität und Karten-Disziplin
  const cardsPer90 = per90(yellow + red * 2, minutes);
  const discipline = clamp100(100 - normalizeRatePer90(cardsPer90, 0.8)); // weniger Karten = besser

  const intelligenz = avg([
    normalizeRatePer90(kp90, 2.5),
    normalizePercent(passAcc),
    discipline,
  ]);

  // ► Physis
  const physis = avg([
    normalizeRatePer90(duels90, 15),
    normalizeRatePer90(foulsComm90, 3),
  ]);

  // ► Technik
  const technik = avg([
    normalizePercent(passAcc),
    normalizePercent(dribbleSuccessRate),
    normalizeRatePer90(kp90, 2.5),
  ]);

  // ► Tempo
  // API-Football hat keine echte Geschwindigkeit, wir nähern über
  // Dribblings + Offensiv-Aktivität
  const tempo = avg([
    normalizePercent(dribbleSuccessRate),
    normalizeRatePer90(dribAttempts ? per90(dribAttempts, minutes) : 0, 6),
    normalizeRatePer90(shotsOn90, 3),
  ]);

  return {
    offensiv: offensiv || null,
    defensiv: defensiv || null,
    intelligenz: intelligenz || null,
    physis: physis || null,
    technik: technik || null,
    tempo: tempo || null,
  };
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

            const scoutingStats = buildScoutingStats(stats);

            const playerObj = {
              apiId: p.id,
              name: p.name ?? null,
              age: p.age ?? null,
              heightCm: parseHeightToCm(p.height),
              position: stats?.games?.position ?? null,
              foot: p.preferred_foot ?? null,
              league: stats?.league?.name ?? null,
              club: stats?.team?.name ?? null,

              // Neues Feld: Foto
              photo: p.photo ?? null,

              // Loan-Infos
              onLoan: loan.onLoan,
              loanFrom: loan.loanFrom,

              // Marktwert wird später im Admin manuell gesetzt
              marketValue: null as number | null,

              // Scouting-Stats 0–100
              stats: scoutingStats,

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