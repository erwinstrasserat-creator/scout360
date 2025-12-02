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

type MinStats = {
  defensiv: number;
  intelligenz: number;
  offensiv: number;
  physis: number;
  technik: number;
  tempo: number;
};

type NeedFilter = {
  heightMin?: number | null;
  heightMax?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  minStats?: Partial<MinStats> | null;
  position?: string | null;
  preferredFoot?: string | null;
  requiredTraits?: string[] | null;
  tolerance?: number | null;
};

type PlayerJson = {
  playerId: number | string;
  name: string;
  age?: number;
  height?: number;
  league?: string;
  position?: string;
  preferredFoot?: string;
  traits?: string[];
  stats?: Partial<MinStats>;
  [key: string]: any;
};

const AVAILABLE_LEAGUES = [
  "Bundesliga",
  "2. Bundesliga",
  "Premier League",
  "La Liga",
  "Serie A",
  "Ligue 1",
  "Eredivisie",
  "MLS",
];

export default function AdminSeedPage() {
  const [fileContent, setFileContent] = useState<PlayerJson[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [needId, setNeedId] = useState("");
  const [needFilter, setNeedFilter] = useState<NeedFilter | null>(null);

  // ---------------------------------------------------------
  // JSON Upload
  // ---------------------------------------------------------
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) {
        setStatus("❌ JSON muss ein Array sein.");
        return;
      }
      setFileContent(json);
      setStatus(`📂 Datei geladen: ${json.length} Spieler.`);
    } catch {
      setStatus("❌ Fehler beim Einlesen der Datei.");
    }
  };

  const handleLeaguesChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const values = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelectedLeagues(values);
  };

  // ---------------------------------------------------------
  // Need Filter laden
  // ---------------------------------------------------------
  const loadNeed = async () => {
    if (!needId.trim()) {
      setStatus("Bitte Need-ID eingeben.");
      return;
    }

    try {
      setLoading(true);
      setStatus("⏳ Need wird geladen...");

      const ref = doc(db, "needs", needId.trim());
      const snap = await (await import("firebase/firestore")).getDoc(ref);

      if (!snap.exists()) {
        setStatus("❌ Need nicht gefunden.");
        return;
      }

      const data = snap.data() as any;

      const filter: NeedFilter = {
        heightMin: data.heightMin ?? null,
        heightMax: data.heightMax ?? null,
        minAge: data.minAge ?? null,
        maxAge: data.maxAge ?? null,
        minStats: data.minStats ?? null,
        position: data.position ?? null,
        preferredFoot: data.preferredFoot ?? null,
        requiredTraits: data.requiredTraits ?? null,
        tolerance: data.tolerance ?? 0,
      };

      setNeedFilter(filter);
      setStatus(`✅ Need '${needId}' geladen.`);

    } catch (err) {
      setStatus("❌ Fehler beim Laden des Needs.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Filter Logik
  // ---------------------------------------------------------
  const valueInRange = (value: number | undefined, min?: number | null, max?: number | null) => {
    if (value == null) return false;
    if (min != null && value < min) return false;
    if (max != null && value > max) return false;
    return true;
  };

  const playerMatchesNeed = (p: PlayerJson, need: NeedFilter) => {
    const tolerance = need.tolerance ?? 0;

    if (!valueInRange(p.age, need.minAge, need.maxAge)) return false;
    if (!valueInRange(p.height, need.heightMin, need.heightMax)) return false;

    if (need.position && p.position) {
      if (!p.position.toLowerCase().includes(need.position.toLowerCase())) {
        return false;
      }
    }

    if (need.preferredFoot && p.preferredFoot) {
      if (!p.preferredFoot.toLowerCase().includes(need.preferredFoot.toLowerCase())) {
        return false;
      }
    }

    if (need.requiredTraits && need.requiredTraits.length > 0) {
      const traits = (p.traits ?? []).map((t) => t.toLowerCase());
      let missing = 0;

      for (const required of need.requiredTraits) {
        const r = required.toLowerCase();
        const match = traits.some((t) => t.includes(r));
        if (!match) missing++;
      }

      if (missing > tolerance) return false;
    }

    if (need.minStats) {
      const stats = p.stats ?? {};
      for (const key of Object.keys(need.minStats) as (keyof MinStats)[]) {
        const requiredMin = need.minStats[key];
        if (requiredMin == null) continue;
        const value = stats[key];
        if (value == null || value < requiredMin - tolerance) {
          return false;
        }
      }
    }

    return true;
  };

  const playerMatchesLeague = (p: PlayerJson) => {
    if (selectedLeagues.length === 0) return true;
    return selectedLeagues.includes(p.league ?? "");
  };

  // ---------------------------------------------------------
  // Spieler importieren
  // ---------------------------------------------------------
  const uploadPlayers = async () => {
    if (fileContent.length === 0) {
      setStatus("❌ Keine JSON-Daten vorhanden.");
      return;
    }

    if (!needFilter) {
      setStatus("❌ Kein Need geladen.");
      return;
    }

    setLoading(true);
    setStatus("⏳ Import läuft...");

    try {
      let total = 0;
      let imported = 0;

      for (const raw of fileContent) {
        total++;

        if (!playerMatchesLeague(raw)) continue;
        if (!playerMatchesNeed(raw, needFilter)) continue;

        const playerId = String(raw.playerId ?? "").trim();
        if (!playerId) continue;

        await setDoc(doc(db, "players", playerId), raw, { merge: true });
        imported++;
      }

      setStatus(`✅ ${imported} / ${total} Spieler importiert.`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Fehler beim Import.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Spieler löschen
  // ---------------------------------------------------------
  const clearDatabase = async () => {
    if (!confirm("⚠️ Alle Spieler löschen?")) return;

    setLoading(true);
    setStatus("⏳ Löschen...");

    try {
      const snap = await getDocs(collection(db, "players"));
      let count = 0;

      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        count++;
      }

      setStatus(`🗑️ ${count} Spieler gelöscht.`);
    } catch (err) {
      setStatus("❌ Fehler beim Löschen.");
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Spieler Import (Seed)</h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        
        {/* Need-ID */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Need-ID eingeben:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={needId}
              onChange={(e) => setNeedId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            />
            <button
              onClick={loadNeed}
              disabled={loading}
              className="rounded-lg bg-sky-500 text-slate-900 px-4 py-1.5 font-semibold"
            >
              Need laden
            </button>
          </div>
        </div>

        {/* Ligen Multi Select */}
        <div className="space-y-2">
          <p className="text-sm text-slate-400">Ligen auswählen:</p>
          <select
            multiple
            className="w-full h-28 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
            value={selectedLeagues}
            onChange={handleLeaguesChange}
          >
            {AVAILABLE_LEAGUES.map((league) => (
              <option key={league}>{league}</option>
            ))}
          </select>
        </div>

        {/* Datei Upload */}
        <div>
          <p className="text-sm text-slate-400">JSON Datei laden:</p>
          <input
            type="file"
            accept=".json"
            onChange={handleFile}
            className="text-sm"
          />
        </div>

        {status && (
          <div className="text-sm text-emerald-400 bg-slate-950 border border-slate-800 p-2 rounded-lg">
            {status}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={uploadPlayers}
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-slate-900 font-semibold hover:bg-emerald-400"
          >
            Spieler importieren
          </button>

          <button
            onClick={clearDatabase}
            disabled={loading}
            className="rounded-lg bg-red-500 px-4 py-2 text-slate-900 font-semibold hover:bg-red-400"
          >
            Alle Spieler löschen
          </button>
        </div>
      </div>
    </div>
  );
}