"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

type NeedFilter = {
  heightMin: number | null;
  heightMax: number | null;
  minAge: number | null;
  maxAge: number | null;
  preferredFoot: string | null;
  position: string | null;
  minStats: {
    defensiv?: number;
    intelligenz?: number;
    offensiv?: number;
    physis?: number;
    technik?: number;
    tempo?: number;
  } | null;
  requiredTraits: string[] | null;
  leagues: string[] | null; // ⬅️ Für Multi-Select
};

export default function AdminSeedPage() {
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [filter, setFilter] = useState<NeedFilter>({
    heightMin: null,
    heightMax: null,
    minAge: null,
    maxAge: null,
    preferredFoot: null,
    position: null,
    minStats: null,
    requiredTraits: null,
    leagues: null,
  });

  const [allLeagues, setAllLeagues] = useState<string[]>([]);

  // Datei laden
  const handleFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const json = JSON.parse(text);
      if (!Array.isArray(json)) {
        setStatus("❌ JSON muss ein Array sein");
        return;
      }

      // Alle Ligen extrahieren (für Multi-Select)
      const leagues = Array.from(
        new Set(json.map((p: any) => p.league).filter(Boolean))
      ).sort();

      setAllLeagues(leagues);
      setFileContent(json);
      setStatus(`✔️ Datei geladen • ${json.length} Spieler`);
    } catch (err) {
      setStatus("❌ Fehler beim Lesen der Datei");
    }
  };

  // Filter anwenden
  const applyFilter = (p: any) => {
    // Height
    if (filter.heightMin && p.heightCm < filter.heightMin) return false;
    if (filter.heightMax && p.heightCm > filter.heightMax) return false;

    // Age
    if (filter.minAge && p.age < filter.minAge) return false;
    if (filter.maxAge && p.age > filter.maxAge) return false;

    // Position
    if (filter.position && p.position !== filter.position) return false;

    // Preferred foot
    if (filter.preferredFoot && p.foot !== filter.preferredFoot) return false;

    // League filter
    if (filter.leagues && filter.leagues.length > 0) {
      if (!filter.leagues.includes(p.league)) return false;
    }

    // Stats
    if (filter.minStats) {
      for (const key of Object.keys(filter.minStats)) {
        const value = (filter.minStats as any)[key];
        if (value && p.stats?.[key] < value) return false;
      }
    }

    // Required traits
    if (
      filter.requiredTraits &&
      filter.requiredTraits.length > 0 &&
      (!p.traits ||
        !filter.requiredTraits.every((t) =>
          p.traits.map((x: string) => x.toLowerCase()).includes(t.toLowerCase())
        ))
    )
      return false;

    return true;
  };

  // Spieler importieren
  const uploadPlayers = async () => {
    if (fileContent.length === 0) {
      setStatus("❌ Keine Datei geladen");
      return;
    }

    const filtered = fileContent.filter(applyFilter);

    setStatus(`⏳ Importiere ${filtered.length} Spieler…`);

    try {
      for (const p of filtered) {
        await setDoc(doc(collection(db, "players")), p);
      }
      setStatus(`✔️ ${filtered.length} Spieler erfolgreich importiert!`);
    } catch (error) {
      console.error(error);
      setStatus("❌ Fehler beim Importieren");
    }
  };

  // Alle Spieler löschen
  const clearDatabase = async () => {
    if (!confirm("Sicher ALLE Spieler löschen?")) return;

    setStatus("⏳ Lösche Datenbank…");

    const snap = await getDocs(collection(db, "players"));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }

    setStatus("✔️ Datenbank geleert.");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Spieler-Import (Seed)</h2>

      {/* Datei Upload */}
      <div className="rounded-xl border p-4 bg-slate-900/60 space-y-4">
        <input type="file" accept=".json" onChange={handleFile} />

        {/* Multi-Select League */}
        {allLeagues.length > 0 && (
          <div>
            <p className="text-sm mb-1">Ligen auswählen:</p>
            <select
              multiple
              className="w-full bg-slate-800 border p-2 rounded"
              onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map(
                  (o) => o.value
                );
                setFilter((f) => ({ ...f, leagues: opts }));
              }}
            >
              {allLeagues.map((lg) => (
                <option key={lg}>{lg}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status */}
        {status && <div className="text-emerald-400 text-sm">{status}</div>}

        {/* JSON Preview */}
        {fileContent.length > 0 && (
          <pre className="max-h-64 overflow-auto text-xs bg-slate-950 p-3 border rounded">
            {JSON.stringify(fileContent.slice(0, 20), null, 2)}
          </pre>
        )}

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={uploadPlayers}
            className="bg-emerald-500 text-slate-900 px-4 py-2 rounded font-semibold"
          >
            Importieren
          </button>

          <button
            onClick={clearDatabase}
            className="bg-red-500 text-slate-900 px-4 py-2 rounded font-semibold"
          >
            Datenbank leeren
          </button>
        </div>
      </div>
    </div>
  );
}