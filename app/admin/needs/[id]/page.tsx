
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const STAT_KEYS = [
  "defensiv",
  "intelligenz",
  "offensiv",
  "physis",
  "technik",
  "tempo",
] as const;

type MinStats = Partial<Record<(typeof STAT_KEYS)[number], number>>;

type Need = {
  position?: string;
  minAge?: number | null;
  maxAge?: number | null;
  heightMin?: number | null;
  heightMax?: number | null;
  preferredFoot?: string | null;
  minStats?: MinStats | null;
  requiredTraits?: string[] | null;
};

export default function EditNeedPage({ params }: { params: { id: string } }) {
  const [need, setNeed] = useState<Need | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // ⛔ Wichtig: keine Firestore-Abfrage während des Next.js-Builds!
    if (typeof window === "undefined") return;

    const loadNeed = async () => {
      const ref = doc(db, "needs", params.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data() as any;

      const normalized: Need = {
        position: data.position ?? "",
        minAge: data.minAge ?? null,
        maxAge: data.maxAge ?? null,
        heightMin: data.heightMin ?? null,
        heightMax: data.heightMax ?? null,
        preferredFoot: data.preferredFoot ?? "egal",
        minStats: data.minStats ?? {},
        requiredTraits: data.requiredTraits ?? [],
      };

      setNeed(normalized);
    };

    loadNeed();
  }, [params.id]);

  if (!need) {
    return <div className="p-6">Need wird geladen…</div>;
  }

  const update = (patch: Partial<Need>) => {
    setNeed((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const updateStat = (key: (typeof STAT_KEYS)[number], value: string) => {
    const num = value === "" ? undefined : Number(value);
    update({
      minStats: {
        ...(need.minStats ?? {}),
        [key]: isNaN(num as number) ? undefined : num,
      },
    });
  };

  const saveNeed = async () => {
    if (!need) return;
    setSaving(true);

    await updateDoc(doc(db, "needs", params.id), {
      ...need,
    });

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
          onChange={(e) =>
            update({ preferredFoot: e.target.value || "egal" })
          }
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
        >
          <option value="egal">egal</option>
          <option value="rechts">rechts</option>
          <option value="links">links</option>
          <option value="beide">beidfüßig</option>
        </select>
      </div>

      {/* Minimum-Stats */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Minimum-Stats</label>
        <div className="grid grid-cols-3 gap-3">
          {STAT_KEYS.map((key) => (
            <div key={key}>
              <label className="text-xs text-slate-500">{key}</label>
              <input
                type="number"
                value={need.minStats?.[key] ?? ""}
                onChange={(e) => updateStat(key, e.target.value)}
                className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Traits */}
      <div className="space-y-1">
        <label className="text-sm text-slate-400">Benötigte Traits</label>
        <input
          type="text"
          placeholder="kommagetrennt"
          value={need.requiredTraits?.join(", ") ?? ""}
          onChange={(e) =>
            update({
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