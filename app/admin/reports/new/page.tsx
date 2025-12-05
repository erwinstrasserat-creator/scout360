"use client";

import { Suspense, useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useAuth } from "../../../../context/AuthContext";
import type { Player } from "../../../../lib/types";

function NewReportForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth() as any;

  const playerId = params.get("player");

  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [matchDate, setMatchDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [minutesObserved, setMinutesObserved] = useState<number | "">("");

  const [rating, setRating] = useState(3);
  const [currentForm, setCurrentForm] = useState("durchschnittlich");
  const [recommendation, setRecommendation] = useState("beobachten");

  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!playerId) return;

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "players", playerId));
        if (snap.exists()) {
          setPlayer({ id: snap.id, ...(snap.data() as Player) });
        }
      } catch (e) {
        console.error("Fehler beim Laden des Spielers:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [playerId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !playerId) return;

    try {
      setSaving(true);
      setStatus("Speichere Report...");

      await addDoc(collection(db, "scoutingReports"), {
        playerId,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdAt: Date.now(),

        matchDate,
        opponent,
        competition,
        minutesObserved:
          minutesObserved === "" ? null : Number(minutesObserved),

        rating,
        currentForm,
        recommendation,
        notes,
      });

      setStatus("Report gespeichert!");

      setTimeout(() => {
        router.push(`/players/${playerId}`);
      }, 800);
    } catch (e) {
      console.error(e);
      setStatus("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="p-6">Spieler wird geladen…</main>;
  if (!player) return <main className="p-6 text-red-400">Spieler nicht gefunden.</main>;

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">
        Neuer Scouting-Report für {player.name}
      </h1>

      {status && <p className="text-emerald-400">{status}</p>}

      <form className="space-y-5" onSubmit={submit}>

        {/* Matchdaten */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Matchdaten</h2>

          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1"
          />

          <input
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1"
            placeholder="Gegner"
          />

          <input
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1"
            placeholder="Wettbewerb"
          />

          <input
            type="number"
            min={0}
            max={120}
            value={minutesObserved}
            onChange={(e) =>
              setMinutesObserved(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
            className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1"
            placeholder="Minuten beobachtet"
          />
        </section>

        {/* Bewertung */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Bewertung</h2>

          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1"
          >
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>{r} Sterne</option>
            ))}
          </select>

          <select
            value={currentForm}
            onChange={(e) => setCurrentForm(e.target.value)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1"
          >
            <option>sehr gut</option>
            <option>gut</option>
            <option>durchschnittlich</option>
            <option>schwach</option>
          </select>

          <select
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            className="w-full rounded bg-slate-950 border border-slate-700 px-2 py-1"
          >
            <option value="sofort verpflichten">sofort verpflichten</option>
            <option value="beobachten">beobachten</option>
            <option value="nicht geeignet">nicht geeignet</option>
          </select>
        </section>

        <textarea
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
          placeholder="Notizen"
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Speichere..." : "Report speichern"}
        </button>
      </form>
    </main>
  );
}

export default function NewReportPage() {
  return (
    <Suspense fallback={<main className="p-6">Lade Report-Form…</main>}>
      <NewReportForm />
    </Suspense>
  );
}