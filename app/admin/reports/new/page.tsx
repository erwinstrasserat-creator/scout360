"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useAuth } from "../../../../context/AuthContext";
import type { Player } from "../../../../lib/types";

export default function NewReportPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth() as any;

  const playerId = params.get("player");

  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formularfelder
  const [matchDate, setMatchDate] = useState("");
  const [opponent, setOpponent] = useState("");
  const [competition, setCompetition] = useState("");
  const [minutesObserved, setMinutesObserved] = useState<number | "">("");

  const [rating, setRating] = useState(3);
  const [currentForm, setCurrentForm] = useState("durchschnittlich");
  const [recommendation, setRecommendation] = useState("beobachten");

  const [notes, setNotes] = useState("");

  // Spieler laden – aber nur im Browser
  useEffect(() => {
    // ⛔ verhindert SSR-Firestore-Zugriff!
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

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

  // Speichern
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
      }, 1000);
    } catch (e) {
      console.error(e);
      setStatus("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6 text-slate-400">
        Spieler wird geladen...
      </main>
    );
  }

  if (!player) {
    return (
      <main className="p-6 text-red-400">
        Spieler nicht gefunden.
      </main>
    );
  }

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

          <div className="flex flex-col">
            <label className="text-xs text-slate-400">Datum</label>
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400">Gegner</label>
            <input
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400">Wettbewerb</label>
            <input
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400">Minuten beobachtet</label>
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
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
            />
          </div>
        </section>

        {/* Bewertung */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Bewertung</h2>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400">Gesamtbewertung</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
            >
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r} Sterne
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400">Form</label>
            <select
              value={currentForm}
              onChange={(e) => setCurrentForm(e.target.value)}
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
            >
              <option>sehr gut</option>
              <option>gut</option>
              <option>durchschnittlich</option>
              <option>schwach</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400">Empfehlung</label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1"
            >
              <option value="sofort verpflichten">sofort verpflichten</option>
              <option value="beobachten">beobachten</option>
              <option value="nicht geeignet">nicht geeignet</option>
            </select>
          </div>
        </section>

        {/* Notes */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Notizen</h2>

          <textarea
            rows={6}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            placeholder="Detailanalyse, Verhalten im Spiel, Technik, Umschaltverhalten, etc."
          />
        </section>

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