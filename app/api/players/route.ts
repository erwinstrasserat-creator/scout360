import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const runtime = "nodejs"; // Firestore funktioniert nur mit Node.js Runtime auf Vercel

export async function GET() {
  try {
    // Firestore-Abfrage
    const snap = await getDocs(collection(db, "players"));

    const players = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(players, { status: 200 });
  } catch (error: any) {
    // Saubere Logging-Ausgabe für Vercel Analytics / Logs
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