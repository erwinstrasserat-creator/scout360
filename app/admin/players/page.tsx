"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

type Player = {
  id: string;
  name: string;
  age?: number;
  height?: number;
  league?: string;
  position?: string;
  overallRating?: number;
};

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ⛔ verhindert Firestore-Zugriff während des Build-Prozesses
    if (typeof window === "undefined") {
      setLoading(false); // <-- WICHTIG, sonst hängt die Seite im Loading!
      return;
    }

    const loadPlayers = async () => {
      try {
        const snap = await getDocs(collection(db, "players"));

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Player[];

        setPlayers(list);
      } catch (err) {
        console.error("Fehler beim Laden der Spieler:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, []);

  if (loading) {
    return <div className="p-4 text-slate-300">Lade Spieler…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Spielerverwaltung</h1>

      <div className="grid gap-3">
        {players.map((p) => (
          <Link
            key={p.id}
            href={`/admin/players/${p.id}`}
            className="border border-slate-700 bg-slate-900/60 rounded-xl p-4 hover:border-emerald-400 transition flex justify-between"
          >
            <div>
              <div className="font-bold text-lg">{p.name}</div>

              <div className="text-sm text-slate-400">
                {p.age ? `${p.age} Jahre` : "Alter unbekannt"} •{" "}
                {p.position ?? "Position unbekannt"}
              </div>

              <div className="text-xs text-slate-500">
                {p.league ?? "Liga unbekannt"} • {p.height ?? "?"} cm
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Rating</div>
              <div className="text-xl font-bold">
                {p.overallRating ?? "-"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {players.length === 0 && (
        <div className="text-slate-500 text-sm">Keine Spieler gefunden.</div>
      )}
    </div>
  );
}