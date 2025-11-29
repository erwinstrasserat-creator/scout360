"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import type { Player } from "../../../../lib/types";

export default function EditPlayerPage() {
  const { id } = useParams();
  const router = useRouter();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [strengthsText, setStrengthsText] = useState("");
  const [weaknessesText, setWeaknessesText] = useState("");

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const ref = doc(db, "players", id as string);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as any;
          const p: Player = { id: snap.id, ...(data as any) };
          setPlayer(p);
          setStrengthsText((data.strengths || []).join(", "));
          setWeaknessesText((data.weaknesses || []).join(", "));
        }
      } catch (e) {
        console.error(e);
        setError("Fehler beim Laden des Spielers.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!player) return;
    setSaving(true);
    setError(null);

    try {
      const strengths = strengthsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const weaknesses = weaknessesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await updateDoc(doc(db, "players", player.id), {
        ...player,
        strengths,
        weaknesses,
      });

      router.push("/admin/players");
    } catch (e) {
      console.error(e);
      setError("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-400 text-sm">Lade Spieler...</p>;
  if (!player) return <p className="text-red-400 text-sm">Spieler nicht gefunden.</p>;

  return (
    <main className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Spieler bearbeiten</h1>
      <p className="text-sm text-slate-400">{player.name}</p>

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        {/* Potenzial & Größe */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Potenzial (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={player.potentialRating ?? ""}
              onChange={(e) =>
                setPlayer((prev) =>
                  prev
                    ? { ...prev, potentialRating: e.target.value === "" ? 0 : Number(e.target.value) }
                    : prev
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Größe (cm)</label>
            <input
              type="number"
              min={150}
              max={210}
              value={player.heightCm ?? ""}
              onChange={(e) =>
                setPlayer((prev) =>
                  prev
                    ? { ...prev, heightCm: e.target.value === "" ? undefined : Number(e.target.value) }
                    : prev
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Stärken */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Stärken (kommagetrennt)</label>
          <input
            value={strengthsText}
            onChange={(e) => setStrengthsText(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>

        {/* Schwächen */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">
            Entwicklungsfelder (kommagetrennt)
          </label>
          <input
            value={weaknessesText}
            onChange={(e) => setWeaknessesText(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? "Speichere..." : "Änderungen speichern"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </main>
  );
}