"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ⛔ verhindert SSR-Firestore-Zugriffe beim Build
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    if (!id) return;

    const loadReport = async () => {
      try {
        const ref = doc(db, "playerReports", id);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setReport({ id: snap.id, ...snap.data() });
        } else {
          setReport(null);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Reports:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id]);

  const deleteReport = async () => {
    if (!confirm("Diesen Report wirklich löschen?")) return;

    try {
      await deleteDoc(doc(db, "playerReports", id));
      router.push("/admin/reports");
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
    }
  };

  if (loading) {
    return <div className="p-4 text-slate-300">Report wird geladen…</div>;
  }

  if (!report) {
    return (
      <div className="p-4 text-slate-400">
        Report nicht gefunden.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">
        Report: {report.playerName ?? "Unbekannter Spieler"}
      </h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div className="text-sm text-slate-400">
          <b>Datum:</b> {report.date ?? "Unbekannt"}
        </div>

        <div>
          <b className="text-slate-300">Zusammenfassung:</b>
          <pre className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 mt-1 whitespace-pre-wrap">
{report.summary ?? "Keine Zusammenfassung"}
          </pre>
        </div>

        {report.details && (
          <div>
            <b className="text-slate-300">Details:</b>
            <pre className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 mt-1 whitespace-pre-wrap">
{report.details}
            </pre>
          </div>
        )}

        {report.ratings && (
          <div>
            <b className="text-slate-300">Ratings:</b>
            <pre className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-3 mt-1">
{JSON.stringify(report.ratings, null, 2)}
            </pre>
          </div>
        )}

        <button
          className="rounded-lg bg-red-500 px-4 py-2 text-slate-900 font-semibold hover:bg-red-400"
          onClick={deleteReport}
        >
          Report löschen
        </button>
      </div>
    </div>
  );
}