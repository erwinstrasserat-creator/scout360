"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function NewNeedPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    position: "",
    minAge: "",
    maxAge: "",
    heightMin: "",
    heightMax: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const createNeed = async () => {
    const data = {
      position: form.position || null,
      minAge: form.minAge ? Number(form.minAge) : null,
      maxAge: form.maxAge ? Number(form.maxAge) : null,
      heightMin: form.heightMin ? Number(form.heightMin) : null,
      heightMax: form.heightMax ? Number(form.heightMax) : null,
      requiredTraits: [],
      minStats: {},
      leagues: [],
    };

    const ref = await addDoc(collection(db, "needs"), data);
    router.push(`/admin/needs/${ref.id}`);
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-xl font-semibold">Neue Need anlegen</h1>

      <div className="space-y-2">
        <label className="text-sm text-slate-400">Position</label>
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          value={form.position}
          onChange={(e) => handleChange("position", e.target.value)}
        />
      </div>

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400">Größe min</label>
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
            value={form.heightMin}
            onChange={(e) => handleChange("heightMin", e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">Größe max</label>
          <input
            type="number"
            className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
            value={form.heightMax}
            onChange={(e) => handleChange("heightMax", e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={createNeed}
        className="bg-emerald-500 px-4 py-2 text-slate-900 rounded font-semibold"
      >
        Need erstellen
      </button>
    </div>
  );
}