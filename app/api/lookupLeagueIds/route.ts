import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://v3.football.api-sports.io";

/* -------------------------------------------
   Länder-Mapping: Deutsch → API-Football
-------------------------------------------- */
const COUNTRY_MAP: Record<string, string> = {
  "Österreich": "Austria",
  "Deutschland": "Germany",
  "Schweiz": "Switzerland",
  "Tschechien": "Czech Republic",
  "Slowakei": "Slovakia",
  "Ungarn": "Hungary",
  "Slowenien": "Slovenia",
  "Kroatien": "Croatia",
  "Serbien": "Serbia",
  "Bosnien": "Bosnia and Herzegovina",
  "Montenegro": "Montenegro",
  "Rumänien": "Romania",
  "Bulgarien": "Bulgaria",
  "Ukraine": "Ukraine",
  "Türkei": "Turkey",
  "Schweden": "Sweden",
  "Norwegen": "Norway",
  "Finnland": "Finland",
  "Schottland": "Scotland",
  "Wales": "Wales",
  "Estland": "Estonia",
  "Lettland": "Latvia",
  "Litauen": "Lithuania",
  "Belgien": "Belgium",
  "Niederlande": "Netherlands",
  "Zypern": "Cyprus",
  "Griechenland": "Greece",
};

/* -------------------------------------------
   Mini Helper
-------------------------------------------- */
function normalize(str: string) {
  return str.toLowerCase().replace(/[\s\-–]+/g, " ").trim();
}

/* -------------------------------------------
   API-Football Fetch
-------------------------------------------- */
async function apiFetch(path: string, params: any) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY fehlt!");

  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("API error " + (await res.text()));
  }

  return res.json();
}

/* -------------------------------------------
   POST – Liga-IDs suchen
-------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const leaguesToLookup: string[] = body.leagues ?? [];

    if (!leaguesToLookup.length) {
      return NextResponse.json(
        { error: "leagues[] required" },
        { status: 400 }
      );
    }

    /* ► 1) Alle Ligen laden */
    const data = await apiFetch("/leagues", {});

    const all = Array.isArray(data.response) ? data.response : [];

    const results: any[] = [];

    /* ► 2) Jede deiner Ligen matchen */
    for (const fullName of leaguesToLookup) {
      const [countryDe, leagueDe] = fullName.split("–").map((s) => s.trim());

      const countryEn = COUNTRY_MAP[countryDe];
      if (!countryEn) {
        results.push({ name: fullName, id: null, reason: "Country not mapped" });
        continue;
      }

      const target = normalize(leagueDe);

      let bestMatch = null;

      for (const entry of all) {
        const apiCountry = entry.country?.name;
        const apiName = entry.league?.name;
        const apiId = entry.league?.id;

        if (!apiCountry || !apiName) continue;
        if (apiCountry !== countryEn) continue;

        const normalized = normalize(apiName);

        if (normalized.includes(target) || target.includes(normalized)) {
          bestMatch = { name: fullName, id: apiId };
          break;
        }
      }

      if (!bestMatch) {
        results.push({ name: fullName, id: null, reason: "No match found" });
      } else {
        results.push(bestMatch);
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("❌ lookupLeagueIds error", err);
    return NextResponse.json(
      { error: err.message ?? "unknown error" },
      { status: 500 }
    );
  }
}