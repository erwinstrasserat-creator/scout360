"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { Player, ScoutingReport } from "../../../lib/types";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";

export default function PlayerProfilePage({ params }: any) {
  const id = params.id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [loading, setLoading] = useState(true);

  const { role } = useAuth() as any;
  const isAdmin = role === "admin";

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Spieler laden
      const snap = await getDoc(doc(db, "players", id));
      if (snap.exists()) {
        setPlayer({ id: snap.id, ...(snap.data() as Player) });
      }

      // Reports laden
      const rSnap = await getDocs(collection(db, "scoutingReports"));
      const allReports = rSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as ScoutingReport),
      }));

      setReports(allReports.filter((r) => r.playerId === id));

      setLoading(false);
    };

    load();
  }, [id]);

  if (!player) {
    return <main className="p-6 text-red-400">Spieler nicht gefunden.</main>;
  }

  return (
    <main className="space-y-6">
      
      {/* Kopfbereich */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex gap-6">
        <div className="w-40 h-40 rounded-xl overflow-hidden bg-slate-800 shrink-0">
          {player.imageUrl ? (
            <img src={player.imageUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center text-xs text-slate-500 h-full">
              Kein Bild
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <p className="text-slate-400">
            {player.age} Jahre • {player.position} • {player.club}
          </p>
          <p className="text-slate-400">Nation: {player.nationality}</p>
          <p className="text-slate-400">Starker Fuß: {player.foot}</p>
          <p className="text-slate-400">
            Größe: {player.heightCm ? `${player.heightCm} cm` : "–"}
          </p>
        </div>
      </section>

      {/* Marktwert / Agentur */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* Marktwert */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold mb-3">Marktwert</h2>

          {player.marketValue ? (
            <>
              <p className="text-emerald-400 text-2xl font-bold">
                € {player.marketValue.toLocaleString("de-DE")}
              </p>
              <p className="text-slate-400 text-sm">
                Quelle: {player.marketValueSource || "Unbekannt"}
              </p>
              {player.marketValueUrl && (
                <a
                  target="_blank"
                  href={player.marketValueUrl}
                  className="text-emerald-400 text-sm hover:text-emerald-300"
                >
                  → Transfermarkt Profil
                </a>
              )}
            </>
          ) : (
            <p className="text-slate-500">Kein Marktwert hinterlegt.</p>
          )}
        </div>

        {/* Management */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold mb-3">Management</h2>
          {player.agency ? (
            <>
              <p className="text-slate-300">{player.agency}</p>
              {player.agencyUrl && (
                <a
                  href={player.agencyUrl}
                  target="_blank"
                  className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                  → Agentur Profil
                </a>
              )}
            </>
          ) : (
            <p className="text-slate-500">Keine Agentur hinterlegt.</p>
          )}
        </div>
      </section>

      {/* Stärken / Schwächen */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold mb-2">Stärken</h2>
          {player.strengths.map((s, i) => (
            <p key={i} className="text-slate-300">• {s}</p>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold mb-2">Schwächen</h2>
          {player.weaknesses.map((w, i) => (
            <p key={i} className="text-slate-300">• {w}</p>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold mb-3">Leistungsprofil</h2>

        <div className="grid md:grid-cols-2 gap-2 text-slate-300 text-sm">
          {Object.entries(player.stats).map(([key, value]) => (
            <p key={key}>
              {key}: <span className="text-emerald-400">{value}</span>
            </p>
          ))}
        </div>
      </section>

      {/* Videos */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold mb-3">Videos</h2>
        <Link
          href={`/players/${id}/videos`}
          className="text-emerald-400 hover:text-emerald-300"
        >
          → Videos ansehen / hinzufügen
        </Link>
      </section>

      {/* -------------------------------------------------- */}
      {/* NEU: SCOUTING REPORTS */}
      {/* -------------------------------------------------- */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold flex justify-between items-center">
          Scouting-Reports
          {isAdmin && (
            <Link
              href={`/admin/reports/new?player=${id}`}
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              + Report hinzufügen
            </Link>
          )}
        </h2>

        {reports.length === 0 && (
          <p className="text-slate-500 text-sm">Noch keine Reports vorhanden.</p>
        )}

        {reports.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm"
          >
            <p className="text-slate-100 font-semibold">
              ⭑ {r.rating} / 5 — {r.currentForm}
            </p>

            <p className="text-slate-400 text-xs mt-1">
              {r.competition || "Begegnung"} —{" "}
              {r.matchDate
                ? new Date(r.matchDate).toLocaleDateString("de-DE")
                : "kein Datum"}
            </p>

            <p className="text-slate-300 mt-2 whitespace-pre-line">
              {r.notes}
            </p>

            <Link
              href={`/admin/reports/${r.id}`}
              className="text-emerald-400 hover:text-emerald-300 text-xs mt-2 block"
            >
              → Kompletten Report anzeigen
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}