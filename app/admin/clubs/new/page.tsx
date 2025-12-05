"use client";

import { useState, FormEvent } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useRouter } from "next/navigation";

export default function NewClubPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [level, setLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) {
      setStatus("Bitte Vereinsnamen eingeben.");
      return;
    }

    // ⛔ Firestore darf nie im Build laufen!
    if (typeof window === "undefined") return;

    setSaving(true);
    setStatus("Speichere Verein...");

    try {
      await addDoc(collection(db, "clubs"), {
        name,
        country,
        level,
        notes,
      });

      router.push("/admin/clubs");
    } catch (e) {
      console.error(e);
      setStatus("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Neuen Verein anlegen</h1>

      {status && <p className="text-sm text-emerald-400">{status}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Vereinsname</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Land</label>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Level / Liga</label>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="z.B. Bundesliga, 2. Liga, RL Ost..."
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-slate-400">Notizen</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Speichere..." : "Speichern"}
        </button>
      </form>
    </main>
  );
}