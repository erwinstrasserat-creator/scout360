"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { ScoutingReport, Player } from "../../../lib/types";

export default function ReportsOverviewPage() {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCompetition, setFilterCompetition] = useState("");

  // ----------------------------------------------
  // Reports & Player-Daten laden
  // ----------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Reports laden
      const rSnap = await getDocs(collection(db, "scoutingReports"));
      const rList = rSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as ScoutingReport),
      }));

      // Spieler laden (nur die relevanten)
      const map: Record<string, Player> = {};

      for (const report of rList) {
        if (!map[report.playerId]) {
          const pSnap = await getDoc(doc(db, "players", report.playerId));
          if (pSnap.exists()) {
            map[report.playerId] = {
              id: pSnap.id,
              ...(pSnap.data() as Player),
            };
          }
        }
      }

      setReports(rList);
      setPlayers(map);
      setLoading(false);
    };

    load();
  }, []);

  // ----------------------------------------------
  // Filter / Suche
  // ----------------------------------------------
  const filteredReports = useMemo(() => {
    let list = [...reports];

    if (search.trim().length > 0) {
      const s = search.toLowerCase();

      list = list.filter((r) => {
        const p = players[r.playerId];
        const name = p ? p.name.toLowerCase() : "";
        const comp = (r.competition || "").toLowerCase();
        const author = r.createdByEmail.toLowerCase();
        return (
          name.includes(s) ||
          comp.includes(s) ||
          author.includes(s)
        );
      });
    }

    if (filterCompetition) {
      list = list.filter(
        (r) => (r.competition || "").toLowerCase() === filterCompetition.toLowerCase()
      );
    }

    // Neueste zuerst
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [reports, players, search, filterCompetition]);

  // ----------------------------------------------

  if (loading) {
    return <main className="p-6 text-slate-400">Berichte werden geladen…</main>;
  }

  return (
    <main className="space-y-6">

      <h1 className="text-xl font-semibold">Scouting-Reports</h1>

      {/* FILTER */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-sm">

        {/* Suche */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Suche (Spieler, Autor, Wettbewerb)</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 outline-none focus:border-emerald-400"
            placeholder="z.B. Mbappé, Champions League, max@scout.com"
          />
        </div>

        {/* Wettbewerb Filter */}
        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Wettbewerb filtern</label>
          <input
            value={filterCompetition}
            onChange={(e) => setFilterCompetition(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 outline-none focus:border-emerald-400"
            placeholder="z.B. Bundesliga, U19, Testspiel"
          />
        </div>

        <p className="text-xs text-slate-500">
          {filteredReports.length} von {reports.length} Berichten
        </p>
      </section>

      {/* LISTE */}
      <section className="space-y-4">

        {filteredReports.map((r) => {
          const player = players[r.playerId];

          return (
            <div
              key={r.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-emerald-400/60 transition"
            >

              {/* Kopf */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-slate-100 font-semibold text-lg">
                    {player ? player.name : "Unbekannter Spieler"}
                  </h2>

                  <p className="text-slate-400 text-xs">
                    {player?.position} • {player?.club}
                  </p>
                </div>

                <Link
                  href={`/admin/reports/${r.id}`}
                  className="text-emerald-400 text-sm hover:text-emerald-300"
                >
                  → Öffnen
                </Link>
              </div>

              {/* META */}
              <div className="mt-3 text-sm">

                <p className="text-slate-300">
                  ⭐ {r.rating} / 5 • {r.currentForm}
                </p>

                <p className="text-slate-400 text-xs mt-1">
                  Wettbewerb: {r.competition || "—"}  
                  {" • "}
                  Datum:{" "}
                  {r.matchDate
                    ? new Date(r.matchDate).toLocaleDateString("de-DE")
                    : "—"}
                </p>

                <p className="text-slate-500 text-xs">
                  Autor: {r.createdByEmail}
                </p>
              </div>

              {/* Kurznotizen */}
              <p className="text-slate-300 text-sm mt-3 line-clamp-2">
                {r.notes}
              </p>

            </div>
          );
        })}

        {filteredReports.length === 0 && (
          <p className="text-slate-500 text-sm">
            Keine passenden Berichte gefunden.
          </p>
        )}

      </section>
    </main>
  );
}