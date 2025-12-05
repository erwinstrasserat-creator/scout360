"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db, storage } from "../../../../lib/firebase";
import type { Player } from "../../../../lib/types";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditPlayerPage() {
  const { id } = useParams();
  const router = useRouter();

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  /* -------------------------------------------------------
     Spieler laden
  ------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;

    // ⛔ Firestore darf nicht im Build ausgeführt werden
    if (typeof window === "undefined") return;

    const loadPlayer = async () => {
      try {
        const snap = await getDoc(doc(db, "players", id as string));
        if (snap.exists()) {
          setPlayer({ id: snap.id, ...(snap.data() as Player) });
        }
      } finally {
        setLoading(false);
      }
    };

    loadPlayer();
  }, [id]);

  const updateField = (field: string, value: any) => {
    if (!player) return;
    setPlayer({ ...player, [field]: value });
  };

  const updateStat = (field: string, value: number) => {
    if (!player) return;
    setPlayer({
      ...player,
      stats: {
        ...player.stats,
        [field]: value,
      },
    });
  };

  /* -------------------------------------------------------
     Bild-Upload
  ------------------------------------------------------- */
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!player) return;

    // ⛔ Nur im Browser
    if (typeof window === "undefined") return;

    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setStatus("Lade Bild hoch...");

    try {
      const storageRef = ref(storage, `players/${player.id}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setPlayer({ ...player, imageUrl: url });
      setStatus("Bild erfolgreich hochgeladen!");
    } catch (err) {
      console.error(err);
      setStatus("Fehler beim Bild-Upload.");
    } finally {
      setUploadingImage(false);
    }
  };

  /* -------------------------------------------------------
     Speichern
  ------------------------------------------------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!player) return;

    // ⛔ Sicherheit: nie im Build
    if (typeof window === "undefined") return;

    setSaving(true);
    setStatus("Speichere Änderungen...");

    try {
      await setDoc(doc(db, "players", player.id), player);
      setStatus("Spieler gespeichert!");
    } catch (err) {
      console.error(err);
      setStatus("Fehler beim Speichern!");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  if (loading) {
    return <main className="p-6 text-slate-400">Spieler wird geladen…</main>;
  }

  if (!player) {
    return <main className="p-6 text-red-400">Spieler nicht gefunden.</main>;
  }

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Spieler bearbeiten</h1>

      {status && (
        <p className="text-sm text-emerald-400">{status}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* BASISDATEN */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basisdaten</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Name" value={player.name} onChange={(v) => updateField("name", v)} />
            <Input label="Alter" type="number" value={player.age} onChange={(v) => updateField("age", Number(v))} />
            <Input label="Nation" value={player.nationality} onChange={(v) => updateField("nationality", v)} />
            <Input label="Verein" value={player.club} onChange={(v) => updateField("club", v)} />
            <Input label="Liga" value={player.league} onChange={(v) => updateField("league", v)} />
            <Input label="Position" value={player.position} onChange={(v) => updateField("position", v)} />
            <Input label="Starker Fuß" value={player.foot} onChange={(v) => updateField("foot", v)} />
            <Input label="Größe (cm)" type="number" value={player.heightCm || ""} onChange={(v) => updateField("heightCm", Number(v))} />
          </div>
        </section>

        {/* SCOUTING */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Scouting Bewertungen</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <NumberInput label="Technik" value={player.stats.technik} onChange={(v) => updateStat("technik", v)} />
            <NumberInput label="Tempo" value={player.stats.tempo} onChange={(v) => updateStat("tempo", v)} />
            <NumberInput label="Physis" value={player.stats.physis} onChange={(v) => updateStat("physis", v)} />
            <NumberInput label="Intelligenz" value={player.stats.intelligenz} onChange={(v) => updateStat("intelligenz", v)} />
            <NumberInput label="Defensiv" value={player.stats.defensiv} onChange={(v) => updateStat("defensiv", v)} />
            <NumberInput label="Offensiv" value={player.stats.offensiv} onChange={(v) => updateStat("offensiv", v)} />

            <NumberInput label="Potenzial (0–100)" value={player.potentialRating} onChange={(v) => updateField("potentialRating", v)} />
            <NumberInput label="Gesamtbewertung" value={player.overallRating || 0} onChange={(v) => updateField("overallRating", v)} />
          </div>
        </section>

        {/* STÄRKEN / SCHWÄCHEN */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Stärken & Schwächen</h2>

          <Textarea
            label="Stärken (eine pro Zeile)"
            value={player.strengths.join("\n")}
            onChange={(v) => updateField("strengths", v.split("\n"))}
          />

          <Textarea
            label="Schwächen (eine pro Zeile)"
            value={player.weaknesses.join("\n")}
            onChange={(v) => updateField("weaknesses", v.split("\n"))}
          />
        </section>

        {/* MARKTWERT */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Marktwert</h2>
          <Input label="Marktwert (€)" type="number" value={player.marketValue || ""} onChange={(v) => updateField("marketValue", Number(v))} />
          <Input label="Quelle" value={player.marketValueSource || ""} onChange={(v) => updateField("marketValueSource", v)} />
          <Input label="Quelle URL" value={player.marketValueUrl || ""} onChange={(v) => updateField("marketValueUrl", v)} />
        </section>

        {/* AGENTUR */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Management / Agentur</h2>
          <Input label="Agentur" value={player.agency || ""} onChange={(v) => updateField("agency", v)} />
          <Input label="Agentur URL" value={player.agencyUrl || ""} onChange={(v) => updateField("agencyUrl", v)} />
        </section>

        {/* BILD */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Profilbild</h2>

          <input type="file" onChange={handleImageUpload} className="text-sm" />

          {player.imageUrl && (
            <img
              src={player.imageUrl}
              className="w-32 h-32 object-cover rounded-lg mt-4 border border-slate-700"
            />
          )}

          {uploadingImage && <p className="text-sm text-slate-400">Bild wird hochgeladen…</p>}
        </section>

        {/* SAVE BUTTON */}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Speichern"}
        </button>
      </form>
    </main>
  );
}

/* --------------------------------------------------------
   Helper Components
-------------------------------------------------------- */

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col text-sm">
      <span className="text-xs text-slate-400 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Input label={label} type="number" value={value} onChange={(v) => onChange(Number(v))} />
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col text-sm">
      <span className="text-xs text-slate-400 mb-1">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 outline-none h-32"
      />
    </label>
  );
}