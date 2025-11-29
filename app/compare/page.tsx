"use client";

import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import type { Player } from "../../lib/types";

export default function ComparePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "players"));
      const list: Player[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setPlayers(list);
    };
    load();
  }, []);

  const keys = [
    { key: "Technik", a: playerA?.stats.technik ?? 0, b: playerB?.stats.technik ?? 0 },
    { key: "Tempo", a: playerA?.stats.tempo ?? 0, b: playerB?.stats.tempo ?? 0 },
    { key: "Physis", a: playerA?.stats.physis ?? 0, b: playerB?.stats.physis ?? 0 },
    { key: "Intelligenz", a: playerA?.stats.intelligenz ?? 0, b: playerB?.stats.intelligenz ?? 0 },
    { key: "Defensiv", a: playerA?.stats.defensiv ?? 0, b: playerB?.stats.defensiv ?? 0 },
    { key: "Offensiv", a: playerA?.stats.offensiv ?? 0, b: playerB?.stats.offensiv ?? 0 },
  ];

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Spieler vergleichen</h1>

      {/* Auswahl Menü */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Spieler A */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="font-semibold mb-2">Spieler A</h2>
          <select
            className="w-full p-2 rounded bg-slate-950 border border-slate-700"
            onChange={(e) => {
              const p = players.find((x) => x.id === e.target.value) || null;
              setPlayerA(p);
            }}
          >
            <option value="">– auswählen –</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position})
              </option>
            ))}
          </select>
        </div>

        {/* Spieler B */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="font-semibold mb-2">Spieler B</h2>
          <select
            className="w-full p-2 rounded bg-slate-950 border border-slate-700"
            onChange={(e) => {
              const p = players.find((x) => x.id === e.target.value) || null;
              setPlayerB(p);
            }}
          >
            <option value="">– auswählen –</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.position})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vergleichstabelle */}
      {playerA && playerB && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="font-semibold mb-4">Vergleich</h2>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left">Attribut</th>
                <th className="text-left">{playerA.name}</th>
                <th className="text-left">{playerB.name}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((row) => (
                <tr key={row.key} className="border-t border-slate-800">
                  <td className="py-2">{row.key}</td>
                  <td className="py-2 text-emerald-400">{row.a}</td>
                  <td className="py-2 text-emerald-400">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}