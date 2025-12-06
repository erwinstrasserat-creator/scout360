// app/admin/needs/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";

interface Need {
  id: string;
  name: string;
  position?: string | null;
  minAge?: number | null;
  maxAge?: number | null;
  heightMin?: number | null;
  heightMax?: number | null;
  preferredFoot?: string | null;
  leagues?: string[];
}

export default function NeedListPage() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadNeeds = async () => {
    const snap = await getDocs(collection(db, "needs"));
    setNeeds(
      snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? "(Ohne Name)",
        ...(d.data() as any),
      }))
    );
  };

  useEffect(() => {
    loadNeeds();
  }, []);

  const deleteNeed = async (id: string) => {
    const need = needs.find((n) => n.id === id);
    if (!need) return;

    if (!confirm(`Need "${need.name}" wirklich löschen?`)) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "needs", id));

      // Sofort aus UI entfernen
      setNeeds((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("❌ Fehler beim Löschen der Need:", err);
      alert("Fehler beim Löschen.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = needs.filter((n) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;

    return (
      (n.name ?? "").toLowerCase().includes(s) ||
      (n.position ?? "").toLowerCase().includes(s) ||
      (n.leagues?.join(" ") ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-200">Needs</h1>

      {/* Suche */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="z.B. RB Salzburg, ZOM, Bundesliga…"
          className="bg-slate-900 border border-slate-700 rounded px-3 py-2 w-full text-slate-200"
        />
        <p className="text-xs text-slate-500 mt-1">
          Filtern nach Name, Position oder Ligen
        </p>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.map((n) => (
          <div
            key={n.id}
            className="border border-slate-800 bg-slate-900/60 rounded p-4"
          >
            <div className="flex justify-between items-start gap-4">
              {/* Link zum Bearbeiten */}
              <Link
                href={`/admin/needs/${n.id}`}
                className="flex-1 hover:opacity-80"
              >
                <div className="text-lg font-semibold text-slate-100">
                  {n.name}
                </div>

                <div className="text-slate-400 text-sm mt-1">
                  {n.position ?? "keine Position"} |
                  Alter: {n.minAge ?? "?"}–{n.maxAge ?? "?"} |
                  Größe: {n.heightMin ?? "?"}–{n.heightMax ?? "?"} cm |
                  Fuß: {n.preferredFoot ?? "egal"}
                </div>

                {n.leagues && n.leagues.length > 0 && (
                  <div className="text-xs text-slate-500 mt-1">
                    Ligen: {n.leagues.join(", ")}
                  </div>
                )}
              </Link>

              {/* Löschen */}
              <button
                onClick={() => deleteNeed(n.id)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-sm font-semibold"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-slate-500">Keine Needs gefunden.</p>
        )}
      </div>
    </div>
  );
}