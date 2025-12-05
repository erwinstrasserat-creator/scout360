"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ⛔ verhindert Firestore-Zugriff im Next.js-Build
    if (typeof window === "undefined") return;

    const loadReports = async () => {
      try {
        const ref = collection(db, "playerReports");
        const snap = await getDocs(ref);

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setReports(list);
      } catch (err) {
        console.error("Fehler beim Laden der Reports:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return <div className="p-4 text-slate-400">Lade Reports…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Scouting Reports</h1>

      <div className="grid gap-3">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`/admin/reports/${report.id}`}
            className="border border-slate-700 bg-slate-900/60 rounded-xl p-4 hover:border-emerald-400 transition"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-semibold">
                  {report.playerName ?? "Unbekannter Spieler"}
                </div>

                <div className="text-sm text-slate-400">
                  {report.date ?? "Datum fehlt"}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  {report.summary?.slice(0, 80) ?? "Keine Zusammenfassung"}…
                </div>
              </div>

              <div className="text-sm text-emerald-300">Öffnen →</div>
            </div>
          </Link>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-slate-500 text-sm">Keine Reports vorhanden.</div>
      )}
    </div>
  );
}