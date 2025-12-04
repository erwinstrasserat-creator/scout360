"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function ClubsAdminPage() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ⛔ Verhindert SSR-Firestore-Zugriff
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    const loadClubs = async () => {
      try {
        const ref = collection(db, "clubs");
        const snap = await getDocs(ref);

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setClubs(list);
      } catch (err) {
        console.error("Fehler beim Laden der Clubs:", err);
      } finally {
        setLoading(false);
      }
    };

    loadClubs();
  }, []);

  if (loading) {
    return <div className="p-4 text-slate-400">Lade Clubs…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Vereine</h1>

      <div className="grid gap-3">
        {clubs.map((club) => (
          <Link
            key={club.id}
            href={`/admin/clubs/${club.id}`}
            className="border border-slate-700 bg-slate-900/60 rounded-xl p-4 hover:border-emerald-400 transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">{club.name}</div>
                <div className="text-sm text-slate-400">
                  {club.country ?? "Land unbekannt"}
                </div>
              </div>

              <div className="text-sm text-emerald-300">Details →</div>
            </div>
          </Link>
        ))}
      </div>

      {clubs.length === 0 && (
        <div className="text-slate-500 text-sm">Keine Clubs gefunden.</div>
      )}
    </div>
  );
}