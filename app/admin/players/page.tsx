"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { Player } from "../../../lib/types";
import Link from "next/link";

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPlayers = async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, "players"));
      const docs: Player[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setPlayers(docs);
    } catch (e) {
      console.error(e);
      setError("Fehler beim Laden der Spieler.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Spieler wirklich löschen?")) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "players", id));
      setPlayers((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("Fehler beim Löschen.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Spieler verwalten</h1>
        <Link
          href="/admin/players/new"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          + Neuer Spieler
        </Link>
      </div>

      {loading && <p className="text-slate-400 text-sm">Lade Spieler...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 text-xs text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Alter</th>
              <th className="px-3 py-2 text-left">Pos</th>
              <th className="px-3 py-2 text-left">Club</th>
              <th className="px-3 py-2 text-left">Liga</th>
              <th className="px-3 py-2 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b border-slate-800/60">
                <td className="px-3 py-2">{p.name}</td>
                <td className="px-3 py-2">{p.age}</td>
                <td className="px-3 py-2">{p.position}</td>
                <td className="px-3 py-2">{p.club}</td>
                <td className="px-3 py-2">{p.league}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  <Link
                    href={`/admin/players/${p.id}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    Bearbeiten
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
                  >
                    {deletingId === p.id ? "Lösche..." : "Löschen"}
                  </button>
                </td>
              </tr>
            ))}
            {players.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-xs text-slate-500"
                >
                  Noch keine Spieler vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}