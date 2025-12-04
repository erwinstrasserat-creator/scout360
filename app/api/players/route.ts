// app/api/players/route.ts
import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/* ----------------------------------------------
   Vercel + Next.js 14: WICHTIG FÜR ALLE API-ROUTEN
----------------------------------------------- */
export const runtime = "nodejs";          // Kein Edge!
export const dynamic = "force-dynamic";   // Niemals SSG
export const revalidate = 0;              // Keine Caches
export const fetchCache = "force-no-store";
export const preferredRegion = "auto";    // Verhindert Prerender
export const maxDuration = 60;            // schützt long-running calls

/* ----------------------------------------------
   GET: Alle Spieler aus Firestore laden
----------------------------------------------- */
export async function GET() {
  try {
    const snap = await getDocs(collection(db, "players"));

    const players = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(players, { status: 200 });

  } catch (error: any) {
    console.error("❌ API /api/players – Fehler:", {
      message: error?.message,
      stack: error?.stack
    });

    return NextResponse.json(
      {
        error: "Failed to load players",
        message: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
