"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

type NeedStats = {
  defensiv: number | null;
  offensiv: number | null;
  intelligenz: number | null;
  physis: number | null;
  technik: number | null;
  tempo: number | null;
};

type Need = {
  position: string | null;
  minAge: number | null;
  maxAge: number | null;
  heightMin: number | null;
  heightMax: number | null;
  preferredFoot: string | null;
  leagues: string[] | null;
  minStats: NeedStats | null;
};

const EMPTY_STATS: NeedStats = {
  defensiv: null,
  offensiv: null,
  intelligenz: null,
  physis: null,
  technik: null,
  tempo: null,
};

export default function EditNeedPage({ params }: { params: { id: string } }) {
  const [need, setNeed] = useState<Need | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadNeed = async () => {
      const ref = doc(db, "needs", params.id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setNeed(null);
        setLoading(false);
        return;
      }

      const d = snap.data() as any;

      const normalized: Need = {
        position: d.position ?? "",
        minAge: d.minAge ?? null,
        maxAge: d.maxAge ?? null,
        heightMin: d.heightMin ?? null,
        heightMax: d.heightMax ?? null,
        preferredFoot: d.preferredFoot ?? "egal",
        leagues: Array.isArray(d.leagues) ? d.leagues : [],
        minStats: { ...EMPTY_STATS, ...(d.minStats || {}) },
      };

      setNeed(normalized);
      setLoading(false);
    };

    loadNeed();
  }, [params.id]);

  const update = (patch: Partial<Need>) => {
    setNeed((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateStat = (key: keyof NeedStats, value: string) => {
    const num = value === "" ? null : Number(value);

    setNeed((prev) =>
      prev
        ? {
            ...prev,
            minStats: {
              ...(prev.minStats || EMPTY_STATS),
              [key]: isNaN(num as any) ? null : num,
            },
          }
        : prev
    );
  };

  const saveNeed = async () => {
    if (!need) return;

    setSaving(true);

    await updateDoc(doc(db, "needs", params.id), {
      ...need,
      leagues: need.leagues ?? [],
      minStats: need.minStats ?? EMPTY_STATS,
    });

    setSaving(false);
    alert("✔ Need gespeichert");
  };

  if (loading || !need) {
    return <div className="p-6 text-slate-300">Need wird geladen…</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Need bearbeiten</h1>

      {/* Position */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Position</label>
        <input
          value={need.position ?? ""}
          onChange={(e) => update({ position: e.target.value })}
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
        />
      </div>

      {/* Alter */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400">Alter min</label>
          <input
            type="number"
            value={need.minAge ?? ""}
            onChange={(e) =>
              update({ minAge: e.target.value ? Number(e.target.value) : null })
            }
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">Alter max</label>
          <input
            type="number"
            value={need.maxAge ?? ""}
            onChange={(e) =>
              update({ maxAge: e.target.value ? Number(e.target.value) : null })
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
            value={need.heightMin ?? ""}
            onChange={(e) =>
              update({
                heightMin: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">Größe max (cm)</label>
          <input
            type="number"
            value={need.heightMax ?? ""}
            onChange={(e) =>
              update({
                heightMax: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          />
        </div>
      </div>

      {/* Preferred Foot */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Bevorzugter Fuß</label>
        <select
          value={need.preferredFoot ?? "egal"}
          onChange={(e) => update({ preferredFoot: e.target.value })}
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
        >
          <option value="egal">egal</option>
          <option value="left">links</option>
          <option value="right">rechts</option>
          <option value="both">beidfüßig</option>
        </select>
      </div>

      {/* Ligen */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Ligen (kommagetrennt)</label>
        <input
          type="text"
          value={need.leagues?.join(", ") ?? ""}
          onChange={(e) =>
            update({
              leagues: e.target.value
                .split(",")
                .map((l) => l.trim())
                .filter(Boolean),
            })
          }
          placeholder="Bundesliga, Zweite Liga, ..."
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
        />
      </div>

      {/* Minimum-Stats */}
      <div className="space-y-2">
        <label className="text-sm text-slate-400">Mindest-Stats (0–100)</label>
        <div className="grid grid-cols-3 gap-3">
          {Object.keys(EMPTY_STATS).map((key) => (
            <div key={key}>
              <label className="text-xs text-slate-500">{key}</label>
              <input
                type="number"
                min={0}
                max={100}
                value={(need.minStats as any)?.[key] ?? ""}
                onChange={(e) =>
                  updateStat(key as keyof NeedStats, e.target.value)
                }
                className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={saveNeed}
        disabled={saving}
        className="bg-emerald-500 px-4 py-2 text-slate-900 rounded font-semibold disabled:opacity-50"
      >
        {saving ? "Speichern…" : "Need speichern"}
      </button>
    </div>
  );
}