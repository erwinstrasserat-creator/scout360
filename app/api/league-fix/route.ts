// app/api/league-fix/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, setDoc, doc } from "firebase/firestore";

export const runtime = "nodejs";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

/* ----------------------------------------------------------
   Helper: API-Football Fetch
---------------------------------------------------------- */
async function apiFootballFetch(path: string, params: Record<string, any>) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new Error("API_FOOTBALL_KEY fehlt in .env.local");
  }

  const url = new URL(API_FOOTBALL_BASE + path);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": apiKey },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football Fehler ${res.status}: ${text}`);
  }

  return res.json();
}

/* ----------------------------------------------------------
   Helper: Text normalisieren
---------------------------------------------------------- */
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/–/g, "-")
    .replace(/liga/g, "league")
    .replace(/premiership/g, "league")
    .replace(/primeira/g, "liga")
    .replace(/1\./g, "1")
    .replace(/2\./g, "2")
    .replace(/\s+/g, " ")
    .trim();
}

/* ----------------------------------------------------------
   Helper: Score (0 oder 1) – exakte Normalisierung
---------------------------------------------------------- */
function similarity(a: string, b: string) {
  return normalize(a) === normalize(b) ? 1 : 0;
}

/* ----------------------------------------------------------
   POST — Auto-Fix der Liga-IDs
---------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const LEAGUES = body.leagues;

    if (!LEAGUES) {
      return NextResponse.json(
        { error: "leagues missing in request body" },
        { status: 400 }
      );
    }

    /* ----------------------------------------------------------
       1) API-Football: alle Ligen holen
    ---------------------------------------------------------- */
    const apiJson = await apiFootballFetch("/leagues", {});

    const allApiLeagues = apiJson.response.map((l: any) => ({
      id: l.league?.id,
      name: l.league?.name ?? "",
      country: l.country?.name ?? "",
      fullName: `${l.country?.name ?? ""} ${l.league?.name ?? ""}`,
    }));

    /* ----------------------------------------------------------
       2) Matching durchführen
    ---------------------------------------------------------- */
    let updatedCount = 0;

    for (const [group, groupLeagues] of Object.entries(LEAGUES)) {
      for (const lg of groupLeagues as any[]) {
        if (lg.id && lg.id !== 0) continue;

        const seedName = lg.name;

        let best = null;
        let bestScore = 0;

        for (const apiLg of allApiLeagues) {
          const score = similarity(seedName, apiLg.fullName);
          if (score > bestScore) {
            best = apiLg;
            bestScore = score;
          }
        }

        if (bestScore === 1 && best) {
          lg.id = best.id;

          await setDoc(
            doc(collection(db, "leagueMappings")),
            {
              seedName,
              detectedId: best.id,
              apiName: best.name,
              apiCountry: best.country,
              updatedAt: Date.now(),
            },
            { merge: true }
          );

          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      updated: updatedCount,
      message: `Updated ${updatedCount} leagues.`,
    });
  } catch (err: any) {
    console.error("❌ league-fix error:", err);
    return NextResponse.json(
      {
        error: "league-fix failed",
        message: err?.message,
      },
      { status: 500 }
    );
  }
}