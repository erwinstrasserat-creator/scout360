// app/admin/needs/new/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

// API-kompatible Positionsliste
const API_POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Attacker"] as const;

type PositionOption = (typeof API_POSITIONS)[number] | "";

export default function NewNeedPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    position: "" as PositionOption,
    minAge: "",
    maxAge: "",
    heightMin: "",
    heightMax: "",
    preferredFoot: "egal", // egal | left | right | both
    leagues: "",
    minDefensiv: "",
    minOffensiv: "",
    minIntelligenz: "",
    minPhysis: "",
    minTechnik: "",
    minTempo: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const createNeed = async () => {
    if (typeof window === "undefined") return;

    setSaving(true);
    setError(null);

    try {
      const needData = {
        // Position – exakt wie in API-Football ("Goalkeeper", "Defender", ...)
        position: form.position || null,

        // Alter
        minAge: form.minAge ? Number(form.minAge) : null,
        maxAge: form.maxAge ? Number(form.maxAge) : null,

        // Größe
        heightMin: form.heightMin ? Number(form.heightMin) : null,
        heightMax: form.heightMax ? Number(form.heightMax) : null,

        // Fuß
        // Wichtig: Werte, die mit API-Football kompatibel sind (left/right/both)
        preferredFoot:
          form.preferredFoot === "egal" ? "egal" : form.preferredFoot,

        // Ligen (kommagetrennt)
        // INFO-Feld – der eigentliche Import arbeitet mit League-IDs
        leagues:
          form.leagues.trim().length > 0
            ? form.leagues.split(",").map((l) => l.trim())
            : [],

        // Mindest-Stats aus API (0–100)
        minStats: {
          defensiv: form.minDefensiv ? Number(form.minDefensiv) : null,
          offensiv: form.minOffensiv ? Number(form.minOffensiv) : null,
          intelligenz: form.minIntelligenz
            ? Number(form.minIntelligenz)
            : null,
          physis: form.minPhysis ? Number(form.minPhysis) : null,
          technik: form.minTechnik ? Number(form.minTechnik) : null,
          tempo: form.minTempo ? Number(form.minTempo) : null,
        },
      };

      const ref = await addDoc(collection(db, "needs"), needData);
      router.push(`/admin/needs/${ref.id}`);
    } catch (err) {
      console.error("❌ Fehler beim Speichern:", err);
      setError("Fehler beim Erstellen der Need.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Neue Need anlegen</h1>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Position */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400">
          Position (API-Original)
        </label>
        <select
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          value={form.position}
          onChange={(e) => handleChange("position", e.target.value)}
        >
          <option value="">keine Vorgabe</option>
          {API_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500">
          Werte kommen direkt aus API-Football, z.B. Defender, Midfielder …
        </p>
      </div>

      {/* Alter */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400">Alter min</label>
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
            value={form.minAge}
            onChange={(e) => handleChange("minAge", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">Alter max</label>
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
            value={form.maxAge}
            onChange={(e) => handleChange("maxAge", e.target.value)}
          />
        </div>
      </div>

      {/* Größe */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400">Größe min (cm)</label>
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
            value={form.heightMin}
            onChange={(e) => handleChange("heightMin", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-slate-400">Größe max (cm)</label>
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
            value={form.heightMax}
            onChange={(e) => handleChange("heightMax", e.target.value)}
          />
        </div>
      </div>

      {/* Bevorzugter Fuß */}
      <div>
        <label className="text-sm text-slate-400">Bevorzugter Fuß</label>
        <select
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          value={form.preferredFoot}
          onChange={(e) => handleChange("preferredFoot", e.target.value)}
        >
          <option value="egal">egal</option>
          <option value="left">links</option>
          <option value="right">rechts</option>
          <option value="both">beidfüßig</option>
        </select>
      </div>

      {/* Ligen */}
      <div>
        <label className="text-sm text-slate-400">
          Ligen (kommagetrennt, optional)
        </label>
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          placeholder="z.B. Bundesliga, 2. Bundesliga"
          value={form.leagues}
          onChange={(e) => handleChange("leagues", e.target.value)}
        />
        <p className="text-[11px] text-slate-500">
          Info-Feld. Für den Import wählst du die Ligen auf der Seed-Seite über
          die API-Liste aus.
        </p>
      </div>

      {/* Mindest-Stats */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Mindest-Stats (0–100)</label>

        <div className="grid grid-cols-2 gap-4">
          {[
            ["minOffensiv", "Offensiv"],
            ["minDefensiv", "Defensiv"],
            ["minTechnik", "Technik"],
            ["minTempo", "Tempo"],
            ["minPhysis", "Physis"],
            ["minIntelligenz", "Intelligenz"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-slate-400">{label}</label>
              <input
                type="number"
                min={0}
                max={100}
                className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
                value={(form as any)[key]}
                onChange={(e) => handleChange(key as any, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={createNeed}
        disabled={saving}
        className="bg-emerald-500 px-4 py-2 text-slate-900 rounded font-semibold disabled:opacity-50"
      >
        {saving ? "Speichere…" : "Need erstellen"}
      </button>
    </div>
  );
}