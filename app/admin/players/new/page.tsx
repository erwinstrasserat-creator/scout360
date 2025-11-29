"use client";

import { FormEvent, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useRouter } from "next/navigation";

export default function NewPlayerPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">(18);
  const [nationality, setNationality] = useState("");
  const [club, setClub] = useState("");
  const [league, setLeague] = useState("");
  const [position, setPosition] = useState("");
  const [foot, setFoot] = useState<"links" | "rechts" | "beidfüßig">("rechts");
  const [heightCm, setHeightCm] = useState<number | "">("");
  const [potentialRating, setPotentialRating] = useState<number | "">(75);
  const [strengthsText, setStrengthsText] = useState("");
  const [weaknessesText, setWeaknessesText] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const strengths = strengthsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const weaknesses = weaknessesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await addDoc(collection(db, "players"), {
        name,
        age: typeof age === "string" ? Number(age) : age,
        nationality,
        club,
        league,
        position,
        foot,
        heightCm:
          heightCm === "" ? null : typeof heightCm === "string" ? Number(heightCm) : heightCm,
        potentialRating:
          potentialRating === ""
            ? null
            : typeof potentialRating === "string"
            ? Number(potentialRating)
            : potentialRating,
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

  return (
    <main className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Neuer Spieler</h1>

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>

        {/* Alter + Nation */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Alter</label>
            <input
              type="number"
              min={14}
              max={30}
              value={age === "" ? "" : age}
              onChange={(e) =>
                setAge(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Nation</label>
            <input
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Club & Liga */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Club</label>
            <input
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Liga</label>
            <input
              value={league}
              onChange={(e) => setLeague(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Position & Fuß */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Position</label>
            <input
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Fuß</label>
            <select
              value={foot}
              onChange={(e) =>
                setFoot(e.target.value as "links" | "rechts" | "beidfüßig")
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="rechts">rechts</option>
              <option value="links">links</option>
              <option value="beidfüßig">beidfüßig</option>
            </select>
          </div>
        </div>

        {/* Größe & Potenzial */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Größe (cm)</label>
            <input
              type="number"
              min={150}
              max={210}
              value={heightCm === "" ? "" : heightCm}
              onChange={(e) =>
                setHeightCm(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Potenzial (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={potentialRating === "" ? "" : potentialRating}
              onChange={(e) =>
                setPotentialRating(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        {/* Stärken */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">
            Stärken (kommagetrennt)
          </label>
          <input
            value={strengthsText}
            onChange={(e) => setStrengthsText(e.target.value)}
            placeholder="z.B. Antritt, Passspiel, Pressing"
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
            placeholder="z.B. Defensivarbeit, Konstanz"
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
            {saving ? "Speichere..." : "Spieler anlegen"}
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