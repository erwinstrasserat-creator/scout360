import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const runtime = "nodejs";

/**
 * Gibt alle verfügbaren Ligen zurück.
 * Holt sie dynamisch aus Firestore → players Collection.
 */
export async function GET() {
  try {
    const snap = await getDocs(collection(db, "players"));

    const leagues = new Set<string>();

    snap.forEach((doc) => {
      const d = doc.data();
      if (typeof d.league === "string" && d.league.trim().length > 0) {
        leagues.add(d.league.trim());
      }
    });

    return NextResponse.json(Array.from(leagues));
  } catch (err) {
    console.error("Error loading leagues:", err);
    return NextResponse.json([], { status: 500 });
  }
}