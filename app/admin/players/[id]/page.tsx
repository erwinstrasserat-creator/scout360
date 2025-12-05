"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();

  const playerId = params?.id as string;

  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ⛔ verhindert SSR-Firestore-Zugriff
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    if (!playerId) return;

    const loadPlayer = async () => {
      try {
        const ref = doc(db, "players", playerId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setPlayer({ id: snap.id, ...snap.data() });
        } else {
          setPlayer(null);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Spielers:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayer();
  }, [playerId]);

  const deletePlayer = async () => {
    if (!confirm("Diesen Spieler wirklich löschen?")) return;

    try {
      await deleteDoc(doc(db, "players", playerId));
      router.push("/admin/players");
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
    }
  };

  if (loading) {
    return <div className="p-4 text-slate-300">Spieler wird geladen…</div>;
  }

  if (!player) {
    return <div className="p-4 text-slate-400">Spieler nicht gefunden.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{player.name}</h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div className="text-sm text-slate-400">
          <b>Alter:</b> {player.age ?? "-"}
        </div>

        <div className="text-sm text-slate-400">
          <b>Größe:</b> 
          {player.heightCm ? `${player.heightCm} cm` : "-"}
        </div>

        <div className="text-sm text-slate-400">
          <b>Liga:</b> {player.league ?? "-"}
        </div>

        <div className="text-sm text-slate-400">
          <b>Position:</b> {player.position ?? "-"}
        </div>

        <div className="text-sm text-slate-400">
          <b>Preferred Foot:</b> {player.foot ?? "-"}
        </div>

        <div>
          <b className="text-slate-300">Stats:</b>
          <pre className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 mt-1">
{JSON.stringify(player.stats ?? {}, null, 2)}
          </pre>
        </div>

        {player.strengths && (
          <div className="text-sm text-slate-400">
            <b>Stärken:</b> {player.strengths.join(", ")}
          </div>
        )}

        {player.weaknesses && (
          <div className="text-sm text-slate-400">
            <b>Schwächen:</b> {player.weaknesses.join(", ")}
          </div>
        )}

        <div>
          <button
            onClick={deletePlayer}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-red-400"
          >
            Spieler löschen
          </button>
        </div>
      </div>
    </div>
  );
}