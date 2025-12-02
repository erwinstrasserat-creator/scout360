"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type Player = {
  league?: string;
};

const STAT_KEYS = [
  "defensiv",
  "intelligenz",
  "offensiv",
  "physis",
  "technik",
  "tempo",
];

export default function EditNeedPage({ params }: { params: { id: string } }) {
  const [need, setNeed] = useState<any>(null);
  const [allLeagues, setAllLeagues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Need laden
  useEffect(() => {
    const loadNeed = async () => {
      const ref = doc(db, "needs", params.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();

        // Defaults
        if (!data.leagues) data.leagues = [];
        if (!data.minStats) data.minStats = {};
        if (!data.requiredTraits) data.requiredTraits = [];

        setNeed(data);
      }
    };

    loadNeed();
  }, [params.id]);

  // Ligen laden (typisiert!)
  useEffect(() => {
    const loadLeagues = async () => {
      try {
        const res = await fetch("/api/players");
        const players: Player[] = await res.json();

        const leagues = Array.from(
          new Set(
            players
              .map((p) => p.league)
              .filter((x): x is string => typeof x === "string" && x.length > 0)
          )
        ).sort();

        setAllLeagues(leagues);
      } catch (err) {
        console.error("Fehler beim Laden der Ligen:", err);
      }
    };

    loadLeagues();
  }, []);

  if (!need) {
    return <div className="p-6">Need wird geladen…</div>;
  }

  const saveNeed = async () => {
    setSaving(true);
    await updateDoc(doc(db, "needs", params.id), need);
    setSaving(false);
    alert("Need gespeichert!");
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Need bearbeiten</h1>

      {/* Position */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Position</label>
        <input
          value={need.position || ""}
          onChange={(e) => setNeed({ ...need, position: e.target.value })}
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
        />
      </div>

      {/* Alter */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400">Alter min</label>
          <input
            type="number"
            value={need.minAge || ""}
            onChange={(e) =>
              setNeed({ ...need, minAge: Number(e.target.value) })
            }
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">Alter max</label>
          <input
            type="number"
            value={need.maxAge || ""}
            onChange={(e) =>
              setNeed({ ...need, maxAge: Number(e.target.value) })
            }
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          />
        </div>
      </div>

      {/* Größe */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400">Größe min (cm)</label>
          <input
            type="number"
            value={need.heightMin || ""}
            onChange={(e) =>
              setNeed({ ...need, heightMin: Number(e.target.value) })
            }
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">Größe max (cm)</label>
          <input
            type="number"
            value={need.heightMax || ""}
            onChange={(e) =>
              setNeed({ ...need, heightMax: Number(e.target.value) })
            }
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          />
        </div>
      </div>

      {/* Preferred Foot */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Bevorzugter Fuß</label>
        <select
          value={need.preferredFoot || ""}
          onChange={(e) =>
            setNeed({ ...need, preferredFoot: e.target.value || null })
          }
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
        >
          <option value="">egal</option>
          <option value="rechts">rechts</option>
          <option value="links">links</option>
          <option value="beide">beidfüßig</option>
        </select>
      </div>

      {/* Multi-League Select */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Ligen</label>
        <select
          multiple
          value={need.leagues || []}
          onChange={(e) => {
            const list = Array.from(e.target.selectedOptions).map(
              (o) => o.value
            );
            setNeed({ ...need, leagues: list });
          }}
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full h-32"
        >
          {allLeagues.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* Minimum Stats */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Minimum-Stats</label>
        <div className="grid grid-cols-3 gap-3">
          {STAT_KEYS.map((key) => (
            <div key={key}>
              <label className="text-xs text-slate-500">{key}</label>
              <input
                type="number"
                value={need.minStats[key] || ""}
                onChange={(e) =>
                  setNeed({
                    ...need,
                    minStats: {
                      ...need.minStats,
                      [key]: Number(e.target.value),
                    },
                  })
                }
                className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Required Traits */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Benötigte Traits</label>
        <input
          type="text"
          placeholder="kommagetrennt"
          value={need.requiredTraits?.join(", ") || ""}
          onChange={(e) =>
            setNeed({
              ...need,
              requiredTraits: e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
        />
      </div>

      <button
        onClick={saveNeed}
        disabled={saving}
        className="bg-emerald-500 px-4 py-2 text-slate-900 rounded font-semibold"
      >
        {saving ? "Speichern…" : "Need speichern"}
      </button>
    </div>
  );
}