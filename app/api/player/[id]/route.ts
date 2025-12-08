// app/api/player/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const ref = doc(db, "players", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { id, ...snap.data() },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("API ERROR /api/player/[id]:", err);

    return NextResponse.json(
      {
        error: "Failed to load player",
        message: err?.message,
        stack: err?.stack,
      },
      { status: 500 }
    );
  }
}