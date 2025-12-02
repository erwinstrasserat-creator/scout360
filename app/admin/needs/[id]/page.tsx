"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

export default function EditNeedPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [need, setNeed] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadNeed = async () => {
      try {
        const ref = doc(db, "needs", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setNeed(snap.data());
        }
      } finally {
        setLoading(false);
      }
    };

    loadNeed();
  }, [id]);

  const updateNeed = async () => {
    if (!need) return;

    try {
      setSaving(true);
      const ref = doc(db, "needs", id);
      await updateDoc(ref, need);
      router.push("/admin/needs");
    } catch (e) {
      console.error("Update error:", e);
    } finally {
      setSaving(false);
    }
  };

  const removeNeed = async () => {
    if (!confirm("Need wirklich löschen?")) return;

    try {
      await deleteDoc(doc(db, "needs", id));
      router.push("/admin/needs");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-4">Lade Need…</div>;
  }

  if (!need) {
    return <div className="p-4">Need nicht gefunden.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Need bearbeiten</h1>

      <div className="space-y-4">
        <label className="block">
          <span className="text-sm text-slate-300">Position</span>
          <input
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={need.position ?? ""}
            onChange={(e) => setNeed({ ...need, position: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Preferred Foot</span>
          <input
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={need.preferredFoot ?? ""}
            onChange={(e) => setNeed({ ...need, preferredFoot: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Min Age</span>
          <input
            type="number"
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={need.minAge ?? ""}
            onChange={(e) =>
              setNeed({ ...need, minAge: Number(e.target.value) })
            }
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Max Age</span>
          <input
            type="number"
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={need.maxAge ?? ""}
            onChange={(e) =>
              setNeed({ ...need, maxAge: Number(e.target.value) })
            }
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Height Min</span>
          <input
            type="number"
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={need.heightMin ?? ""}
            onChange={(e) =>
              setNeed({ ...need, heightMin: Number(e.target.value) })
            }
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Height Max</span>
          <input
            type="number"
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={need.heightMax ?? ""}
            onChange={(e) =>
              setNeed({ ...need, heightMax: Number(e.target.value) })
            }
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Traits (Kommagetrennt)</span>
          <input
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={(need.requiredTraits ?? []).join(", ")}
            onChange={(e) =>
              setNeed({
                ...need,
                requiredTraits: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0),
              })
            }
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-300">Tolerance</span>
          <input
            type="number"
            className="w-full rounded-md bg-slate-900 border border-slate-700 p-2"
            value={need.tolerance ?? 0}
            onChange={(e) =>
              setNeed({ ...need, tolerance: Number(e.target.value) })
            }
          />
        </label>

        <button
          className="px-4 py-2 bg-emerald-500 text-slate-900 rounded-md font-bold"
          onClick={updateNeed}
          disabled={saving}
        >
          Speichern
        </button>

        <button
          className="px-4 py-2 bg-red-500 text-slate-900 rounded-md font-bold"
          onClick={removeNeed}
        >
          Löschen
        </button>
      </div>
    </div>
  );
}