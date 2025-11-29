"use client";

import { useState } from "react";
import { db } from "../../../lib/firebase";
import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";

export default function AdminSeedPage() {
  const [fileContent, setFileContent] = useState<any[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const handleFile = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json)) {
        setFileContent(json);
        setStatus(`Datei geladen: ${json.length} Spieler`);
      } else {
        setStatus("Fehler: JSON muss ein Array sein");
      }
    } catch (err) {
      setStatus("Fehler beim Lesen der Datei");
    }
  };

  const uploadPlayers = async () => {
    try {
      setStatus("Lade Spieler...");

      for (const p of fileContent) {
        await setDoc(doc(collection(db, "players")), p);
      }

      setStatus("Spieler erfolgreich importiert!");
    } catch (error) {
      setStatus("Fehler beim Importieren");
    }
  };

  const clearDatabase = async () => {
    if (!confirm("Sicher, dass du ALLE Spieler löschen möchtest?")) return;

    setStatus("Lösche Spieler...");

    const ref = collection(db, "players");
    const snap = await import("firebase/firestore").then((m) =>
      m.getDocs(ref)
    );

    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }

    setStatus("Datenbank geleert.");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Spieler Import (Seed)</h2>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">

        {/* Datei Upload */}
        <div>
          <p className="text-sm text-slate-400 mb-2">
            Lade eine JSON Datei mit Spielern:
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleFile}
            className="text-sm"
          />
        </div>

        {/* Status */}
        {status && (
          <div className="text-sm text-emerald-400">{status}</div>
        )}

        {/* Spieler Preview */}
        {fileContent.length > 0 && (
          <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 text-xs max-h-64 overflow-auto">
            <pre>{JSON.stringify(fileContent, null, 2)}</pre>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={uploadPlayers}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-slate-900 font-semibold hover:bg-emerald-400"
          >
            Spieler importieren
          </button>

          <button
            onClick={clearDatabase}
            className="rounded-lg bg-red-500 px-4 py-2 text-slate-900 font-semibold hover:bg-red-400"
          >
            Datenbank leeren
          </button>
        </div>
      </div>
    </div>
  );
}