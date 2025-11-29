"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import type { ScoutingReport, Player } from "../../../../lib/types";
import Link from "next/link";

export default function ReportDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [report, setReport] = useState<ScoutingReport | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------
  // Report & Spieler laden
  // -------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Report laden
      const snap = await getDoc(doc(db, "scoutingReports", id));
      if (!snap.exists()) {
        setReport(null);
        setLoading(false);
        return;
      }

      const r = { id: snap.id, ...(snap.data() as ScoutingReport) };
      setReport(r);

      // Spieler laden
      const pSnap = await getDoc(doc(db, "players", r.playerId));
      if (pSnap.exists()) {
        setPlayer({ id: pSnap.id, ...(pSnap.data() as Player) });
      }

      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <main className="p-6 text-slate-400 text-sm">
        Bericht wird geladen…
      </main>
    );
  }

  if (!report) {
    return (
      <main className="p-6 text-red-400 text-sm">
        Scouting-Report nicht gefunden.
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Scouting-Report</h1>
        {player && (
          <Link
            href={`/players/${player.id}`}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ← zurück zu {player.name}
          </Link>
        )}
      </div>

      {/* REPORT CARD */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
        
        {/* Kopfbereich */}
        {player && (
          <div>
            <h2 className="text-lg font-semibold">{player.name}</h2>
            <p className="text-slate-400 text-sm">
              {player.position} • {player.club} • {player.age} Jahre
            </p>
          </div>
        )}

        {/* Meta / Datum */}
        <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-4 text-sm">
          <p className="text-slate-300">
            Bericht von: <span className="text-emerald-400">{report.createdByEmail}</span>
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Erstellt am:{" "}
            {new Date(report.createdAt).toLocaleDateString("de-DE")}
          </p>
        </div>

        {/* Matchdaten */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Match-Daten</h3>

          <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-300">

            <p>
              <strong className="text-slate-100">Datum:</strong>{" "}
              {report.matchDate
                ? new Date(report.matchDate).toLocaleDateString("de-DE")
                : "—"}
            </p>

            <p>
              <strong className="text-slate-100">Wettbewerb:</strong>{" "}
              {report.competition || "—"}
            </p>

            <p>
              <strong className="text-slate-100">Gegner:</strong>{" "}
              {report.opponent || "—"}
            </p>

            <p>
              <strong className="text-slate-100">Minuten beobachtet:</strong>{" "}
              {report.minutesObserved ?? "—"} Minuten
            </p>

          </div>
        </section>

        {/* Bewertung */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Bewertung</h3>

          <div className="grid md:grid-cols-2 gap-3 text-slate-300 text-sm">

            <p>
              <strong className="text-slate-100">Rating:</strong>{" "}
              ⭐ {report.rating} / 5
            </p>

            <p>
              <strong className="text-slate-100">Form:</strong>{" "}
              {report.currentForm}
            </p>

            <p>
              <strong className="text-slate-100">Empfehlung:</strong>{" "}
              {report.recommendation}
            </p>

          </div>
        </section>

        {/* Notizen */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Notizen zur Beobachtung</h3>
          <div className="whitespace-pre-line text-slate-300 text-sm rounded-xl bg-slate-950/40 border border-slate-800 p-4">
            {report.notes || "Keine Notizen vorhanden."}
          </div>
        </section>
      </section>

    </main>
  );
}