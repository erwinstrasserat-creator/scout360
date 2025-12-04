"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  getDoc,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

export default function AssignPlayerPage() {
  const params = useParams();
  const router = useRouter();

  const playerId = params?.playerId as string;

  const [player, setPlayer] = useState<any>(null);
  const [needs, setNeeds] = useState<any[]>([]);
  const [selectedNeed, setSelectedNeed] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!playerId) return;

    const loadData = async () => {
      try {
        // Spieler laden
        const playerSnap = await getDoc(doc(db, "players", playerId));
        setPlayer(playerSnap.exists() ? playerSnap.data() : null);

        // Needs laden
        const needsSnap = await getDocs(collection(db, "needs"));
        const needList = needsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        setNeeds(needList);
      } catch (err) {
        console.error("Fehler beim Laden:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [playerId]);

  const assignNeed = async () => {
    if (!selectedNeed) {
      alert("Bitte ein Need auswählen.");
      return;
    }

    try {
      setSaving(true);

      await updateDoc(doc(db, "players", playerId), {
        assignedNeed: selectedNeed,
      });

      alert("Need erfolgreich zugewiesen.");
      router.push("/admin/players");
    } catch (err) {
      console.error("Fehler beim Zuweisen:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-slate-400">Lade Daten…</div>;
  }

  if (!player) {
    return (
      <div className="p-6 text-slate-400">
        Spieler nicht gefunden.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Need zuweisen</h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <div>
          <div className="font-semibold text-lg">{player.name}</div>
          <div className="text-sm text-slate-400">
            {player.position ?? "Position unbekannt"}
          </div>
        </div>

        <label className="block">
          <span className="text-sm text-slate-300">Need auswählen</span>

          <select
            value={selectedNeed}
            onChange={(e) => setSelectedNeed(e.target.value)}
            className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 focus:border-emerald-400 outline-none"
          >
            <option value="">Bitte wählen…</option>

            {needs.map((need) => (
              <option key={need.id} value={need.id}>
                {need.position} — {need.minAge}-{need.maxAge} Jahre
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={assignNeed}
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-slate-900 font-semibold hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Need zuweisen"}
        </button>
      </div>
    </div>
  );
}