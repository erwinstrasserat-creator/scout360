"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { Club } from "../../../lib/types";
import Link from "next/link";

export default function ClubsAdminPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "clubs"));
      const list: Club[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setClubs(list);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vereine</h1>
        <Link
          href="/admin/clubs/new"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
        >
          + Neuer Verein
        </Link>
      </div>

      {loading && (
        <p className="text-sm text-slate-400">Lade Vereine...</p>
      )}

      <div className="space-y-3">
        {clubs.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm"
          >
            <p className="font-semibold text-slate-100">{c.name}</p>
            <p className="text-xs text-slate-400">
              {c.country || "Land unbekannt"} • {c.level || "Level unbekannt"}
            </p>
            {c.notes && (
              <p className="text-xs text-slate-400 mt-1">{c.notes}</p>
            )}
          </div>
        ))}

        {!loading && clubs.length === 0 && (
          <p className="text-sm text-slate-500">
            Noch keine Vereine angelegt.
          </p>
        )}
      </div>
    </main>
  );
}