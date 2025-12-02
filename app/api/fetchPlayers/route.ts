// app/api/fetchPlayers/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/**
 * API-Football Wrapper
 */
async function apiFootballFetch(
  path: string,
  params: Record<string, string | number>
) {
  const apiKey = process.env.API_FOOTBALL_KEY;

  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt in .env.local");
  }

  const url = new URL(API_FOOTBALL_BASE + path);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, String(v))
  );

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

/**
 * Höhe aus "180 cm" → 180
 */
function parseHeightToCm(height: string | undefined | null): number | null {
  if (!height) return null;
  const n = parseInt(height);
  return Number.isNaN(n) ? null : n;
}

/**
 * Leihstatus aus Transfers (falls vorhanden)
 */
function extractLoanInfo(transfers: any[] | undefined | null): {
  onLoan: boolean;
  loanFrom: string | null;
} {
  if (!Array.isArray(transfers)) return { onLoan: false, loanFrom: null };

  for (const t of transfers) {
    const type = (t?.type ?? "").toString().toLowerCase();
    if (type.includes("loan")) {
      // bei API-Football ist "in" normalerweise der verleihende Club
      const loanFrom = t?.teams?.in?.name ?? null;
      return { onLoan: true, loanFrom };
    }
  }

  return { onLoan: false, loanFrom: null };
}

/**
 * Marktwert-Score (0–100) + grobe €-Schätzung
 * -> rein heuristisch, KEINE echten Transfermarkt-Werte
 */
function computeMarketScore(player: {
  age: number | null;
  leagueId: number | null;
  minutes: number;
  rating: number | null;
  position: string | null;
}): { marketScore: number; marketValueEstimate: number } {
  const { age, leagueId, minutes, rating, position } = player;

  // 1) Liga-Stärke (Beispiele, kannst du anpassen)
  const leagueTierMap: Record<number, number> = {
    // England
    39: 1, // Premier League
    40: 2,
    41: 3,
    // Deutschland
    78: 1,
    79: 2,
    80: 3,
    // Spanien
    140: 1,
    141: 2,
    // Italien
    135: 1,
    136: 2,
    138: 3,
    // Frankreich
    61: 1,
    62: 2,
    // Türkei
    203: 2,
    204: 3,
    // Rest europa – Beispiel
    88: 2,
    94: 2,
    144: 2,
    218: 3,
    87: 3,
    96: 2,
    179: 3,
    45: 3,
    // Afrika / Asien kannst du später ergänzen
  };

  const tier = leagueId ? leagueTierMap[leagueId] ?? 3 : 4; // 1=Top, 4=niedrig
  const leagueFactor = 1 - (tier - 1) * 0.15; // 1 → 1.0, 2 → 0.85, 3 → 0.7, 4 → 0.55

  // 2) Alters-Faktor – Peak bei ~24
  let ageFactor = 0.6;
  if (age != null) {
    const diff = Math.abs(age - 24);
    ageFactor = Math.max(0.2, 1 - diff * 0.05); // pro Jahr ±5 % weniger
  }

  // 3) Einsatzzeit
  const minutesFactor = Math.min(1, minutes / 2500); // ab ~2500 Minuten ~1.0

  // 4) Performance (Rating)
  let ratingFactor = 0.6;
  if (rating && rating > 0) {
    ratingFactor = Math.min(1, Math.max(0.4, (rating - 5.5) / 2)); // 6.5–7.5 → ok bis top
  }

  // 5) Positions-Bonus (Zentrum leicht höher)
  let posFactor = 1;
  const pos = (position ?? "").toLowerCase();
  if (pos.includes("attacking") || pos.startsWith("cf") || pos.startsWith("st")) {
    posFactor = 1.05;
  } else if (pos.includes("centre") || pos.includes("central")) {
    posFactor = 1.0;
  } else if (pos.includes("full") || pos.includes("wing back")) {
    posFactor = 0.95;
  }

  // Score gewichtete Mischung
  let score =
    30 * leagueFactor +
    25 * ageFactor +
    25 * minutesFactor +
    20 * ratingFactor;

  score *= posFactor;

  // Clamp 0–100
  score = Math.max(0, Math.min(100, score));

  // Marktwert grob schätzen: nicht-linear skalieren
  // 0 → ~0, 50 → ~5 Mio, 100 → ~40 Mio (nur Beispiel!)
  const valueEstimate = Math.round(((score / 100) ** 2.2) * 40_000_000);

  return { marketScore: Math.round(score), marketValueEstimate: valueEstimate };
}

/**
 * POST – Spieler laden
 */
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
    const playerCache = new Set<number>();

    for (const leagueId of leagueIds) {
      // 1) Teams der Liga
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

      // 2) Für jedes Team Spieler holen
      for (const teamId of teamIds) {
        let page = 1;
        const maxPages = 10;

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

            if (!p?.id) continue;
            if (playerCache.has(p.id)) continue;
            playerCache.add(p.id);

            const minutes = stat?.games?.minutes ?? 0;
            const ratingRaw = stat?.games?.rating;
            const rating =
              typeof ratingRaw === "string" ? Number(ratingRaw) : ratingRaw ?? null;

            const { onLoan, loanFrom } = extractLoanInfo(p.transfers);

            // Score berechnen
            const market = computeMarketScore({
              age: p.age ?? null,
              leagueId: stat?.league?.id ?? null,
              minutes,
              rating,
              position: stat?.games?.position ?? null,
            });

            const playerObj = {
              apiId: p.id,
              name: p.name ?? null,
              age: p.age ?? null,
              heightCm: parseHeightToCm(p.height),
              position: stat?.games?.position ?? null,
              foot: p.preferred_foot ?? null,
              league: stat?.league?.name ?? null,
              leagueId: stat?.league?.id ?? null,
              club: stat?.team?.name ?? null,

              onLoan,
              loanFrom,

              stats: {
                appearances: stat?.games?.appearences ?? 0,
                minutes,
                goals: stat?.goals?.total ?? 0,
                assists: stat?.goals?.assists ?? 0,
                rating,
              },

              traits: [] as string[],

              marketScore: market.marketScore,
              marketValueEstimate: market.marketValueEstimate,
            };

            allPlayers.push(playerObj);
          }

          if (!playersJson.paging || page >= playersJson.paging.total) break;
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