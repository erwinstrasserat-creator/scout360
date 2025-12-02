"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function NeedsPage() {
  const [needs, setNeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNeeds = async () => {
      try {
        const ref = collection(db, "needs");
        const snap = await getDocs(ref);

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setNeeds(list);
      } catch (err) {
        console.error("Fehler beim Laden der Needs:", err);
        setError("Fehler beim Laden der Bedarfslisten.");
      } finally {
        setLoading(false);
      }
    };

    loadNeeds();
  }, []);

  if (loading) {
    return <div className="p-4 text-slate-400">Needs werden geladen…</div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Club Needs</h1>

      <div className="grid gap-3">
        {needs.map((n) => (
          <Link
            key={n.id}
            href={`/admin/needs/${n.id}`}
            className="border border-slate-700 bg-slate-900/60 rounded-xl p-4 hover:border-emerald-400 transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-semibold">
                  {n.position ?? "Unbekannte Position"}
                </div>

                <div className="text-sm text-slate-400">
                  Alter: {n.minAge ?? "-"} – {n.maxAge ?? "-"} • Größe:{" "}
                  {n.heightMin ?? "-"} – {n.heightMax ?? "-"} cm
                </div>

                {Array.isArray(n.requiredTraits) &&
                  n.requiredTraits.length > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      Traits: {n.requiredTraits.join(", ")}
                    </div>
                  )}
              </div>

              <div className="text-sm text-emerald-300">
                Bearbeiten →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {needs.length === 0 && (
        <div className="text-slate-500 text-sm">
          Keine Bedarfslisten vorhanden.
        </div>
      )}
    </div>
  );
}