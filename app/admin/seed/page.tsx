"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

type Player = {
  apiId?: number;
  name?: string;
  age?: number | null;
  heightCm?: number | null;
  position?: string | null;
  foot?: string | null;
  league?: string | null;
  club?: string | null;
  stats?: {
    defensiv?: number;
    intelligenz?: number;
    offensiv?: number;
    physis?: number;
    technik?: number;
    tempo?: number;
  };
  traits?: string[];
};

type NeedDoc = {
  id: string;
  position?: string;
  minAge?: number | null;
  maxAge?: number | null;
  heightMin?: number | null;
  heightMax?: number | null;
  preferredFoot?: string | null;
  minStats?: {
    defensiv?: number;
    intelligenz?: number;
    offensiv?: number;
    physis?: number;
    technik?: number;
    tempo?: number;
  } | null;
  requiredTraits?: string[] | null;
  leagues?: string[] | null;
};

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
  leagues: string[] | null;
};

// Fixe Ligen-Konfiguration mit API-Football IDs
const LEAGUES = {
  topEurope: [
    { id: 39, name: "Premier League" },
    { id: 140, name: "La Liga" },
    { id: 78, name: "Bundesliga" },
    { id: 135, name: "Serie A" },
    { id: 61, name: "Ligue 1" },
  ],
  restEurope: [
    { id: 94, name: "Primeira Liga (Portugal)" },
    { id: 88, name: "Eredivisie (Niederlande)" },
    { id: 144, name: "Pro League (Belgien)" },
  ],
  asia: [
    { id: 98, name: "J-League (Japan)" },
    { id: 292, name: "K-League 1 (Südkorea)" },
  ],
  africa: [
    { id: 233, name: "Egypt Premier League" },
    { id: 196, name: "South Africa Premier Division" },
    { id: 200, name: "Morocco Botola Pro" },
  ],
};

const SEASONS = [2023, 2024, 2025, 2026];

export default function AdminSeedPage() {
  const [needs, setNeeds] = useState<NeedDoc[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState<string>("");

  const [season, setSeason] = useState<number>(2025); // Default 2025
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>([]);

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

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Needs laden
  useEffect(() => {
    const loadNeeds = async () => {
      const snap = await getDocs(collection(db, "needs"));
      const list: NeedDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setNeeds(list);
    };

    loadNeeds();
  }, []);

  // Need als Filter übernehmen
  const applyNeedAsFilter = (needId: string) => {
    setSelectedNeedId(needId);

    const nd = needs.find((n) => n.id === needId);
    if (!nd) return;

    const newFilter: NeedFilter = {
      heightMin: nd.heightMin ?? null,
      heightMax: nd.heightMax ?? null,
      minAge: nd.minAge ?? null,
      maxAge: nd.maxAge ?? null,
      preferredFoot: nd.preferredFoot ?? null,
      position: nd.position ?? null,
      minStats: nd.minStats ?? null,
      requiredTraits: nd.requiredTraits ?? null,
      leagues: nd.leagues ?? null,
    };

    setFilter(newFilter);
    setStatus("Filter aus Need übernommen.");
  };

  const toggleLeague = (id: number) => {
    setSelectedLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Prüfen, ob Spieler zum Filter passt
  const matchesFilter = (p: Player): boolean => {
    // Alter
    if (filter.minAge !== null && (p.age ?? 0) < filter.minAge) return false;
    if (filter.maxAge !== null && (p.age ?? 0) > filter.maxAge) return false;

    // Größe
    if (filter.heightMin !== null && (p.heightCm ?? 0) < filter.heightMin)
      return false;
    if (filter.heightMax !== null && (p.heightCm ?? 0) > filter.heightMax)
      return false;

    // Position (sehr grob – hier könntest du später Mapping machen)
    if (
      filter.position &&
      p.position &&
      filter.position.trim() !== "" &&
      !p.position.toLowerCase().includes(filter.position.toLowerCase())
    ) {
      return false;
    }

    // Bevorzugter Fuß
    if (
      filter.preferredFoot &&
      filter.preferredFoot.toLowerCase() !== "egal" &&
      p.foot &&
      p.foot.toLowerCase() !== filter.preferredFoot.toLowerCase()
    ) {
      return false;
    }

    // Ligen aus Need (falls gesetzt)
    if (filter.leagues && filter.leagues.length > 0) {
      if (!p.league || !filter.leagues.includes(p.league)) return false;
    }

    // Stats – nur wenn sowohl Filter als auch Player stats haben
    if (filter.minStats && p.stats) {
      const keys = Object.keys(filter.minStats) as (keyof Player["stats"])[];
      for (const key of keys) {
        const minValue = filter.minStats[key];
        if (typeof minValue === "number") {
          const playerValue = p.stats?.[key] ?? 0;
          if (playerValue < minValue) return false;
        }
      }
    }

    // Traits
    if (
      filter.requiredTraits &&
      filter.requiredTraits.length > 0 &&
      (!p.traits || p.traits.length === 0)
    ) {
      return false;
    }

    if (
      filter.requiredTraits &&
      filter.requiredTraits.length > 0 &&
      p.traits &&
      p.traits.length > 0
    ) {
      const playerTraitsLower = p.traits.map((t) => t.toLowerCase());
      for (const t of filter.requiredTraits) {
        if (!playerTraitsLower.includes(t.toLowerCase())) {
          return false;
        }
      }
    }

    return true;
  };

  const importFromApi = async () => {
    if (!selectedLeagueIds.length) {
      setStatus("❌ Bitte mindestens eine Liga auswählen.");
      return;
    }

    setLoading(true);
    setStatus("⏳ Lade Spieler aus API-Football…");

    try {
      const res = await fetch("/api/fetchPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          // 🔥 WICHTIG: Name muss leagueIds heißen, wie in deiner API
          leagueIds: selectedLeagueIds.map((id) => Number(id)),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("fetchPlayers error:", text);
        setStatus("❌ Fehler beim Abrufen der Spieler.");
        setLoading(false);
        return;
      }

      const players: Player[] = await res.json();
      const filtered = players.filter(matchesFilter);

      setStatus(
        `⏳ Importiere ${filtered.length} von ${players.length} geladenen Spielern…`
      );

      for (const p of filtered) {
        await setDoc(doc(collection(db, "players")), p);
      }

      setStatus(
        `✔️ Import abgeschlossen: ${filtered.length} Spieler gespeichert.`
      );
    } catch (err) {
      console.error(err);
      setStatus("❌ Unerwarteter Fehler beim Import.");
    } finally {
      setLoading(false);
    }
  };

  const clearDatabase = async () => {
    if (!confirm("Sicher, dass du ALLE Spieler löschen möchtest?")) return;

    setStatus("⏳ Lösche Spieler…");

    const snap = await getDocs(collection(db, "players"));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }

    setStatus("✔️ Datenbank geleert.");
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold">Spieler Import (Seed)</h2>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        {/* Need Auswahl */}
        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            1. Wähle eine Need als Filter:
          </p>
          <select
            value={selectedNeedId}
            onChange={(e) => applyNeedAsFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
          >
            <option value="">Keine Need (nur Liga/Season)</option>
            {needs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.position ?? "Ohne Position"} – Alter{" "}
                {n.minAge ?? "?"}-{n.maxAge ?? "?"}
              </option>
            ))}
          </select>
        </div>

        {/* Season */}
        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            2. Saison auswählen (Season):
          </p>
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Ligen Auswahl */}
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            3. Ligen auswählen (Multi-Select):
          </p>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {/* Top Europa */}
            <div className="border border-slate-800 rounded-lg p-3">
              <div className="font-semibold mb-2">Top-Ligen Europa</div>
              {LEAGUES.topEurope.map((lg) => (
                <label
                  key={lg.id}
                  className="flex items-center gap-2 text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedLeagueIds.includes(lg.id)}
                    onChange={() => toggleLeague(lg.id)}
                  />
                  {lg.name}
                </label>
              ))}
            </div>

            {/* Rest Europa */}
            <div className="border border-slate-800 rounded-lg p-3">
              <div className="font-semibold mb-2">Rest Europa</div>
              {LEAGUES.restEurope.map((lg) => (
                <label
                  key={lg.id}
                  className="flex items-center gap-2 text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedLeagueIds.includes(lg.id)}
                    onChange={() => toggleLeague(lg.id)}
                  />
                  {lg.name}
                </label>
              ))}
            </div>

            {/* Asien */}
            <div className="border border-slate-800 rounded-lg p-3">
              <div className="font-semibold mb-2">Asien (Japan / Korea)</div>
              {LEAGUES.asia.map((lg) => (
                <label
                  key={lg.id}
                  className="flex items-center gap-2 text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedLeagueIds.includes(lg.id)}
                    onChange={() => toggleLeague(lg.id)}
                  />
                  {lg.name}
                </label>
              ))}
            </div>

            {/* Afrika */}
            <div className="border border-slate-800 rounded-lg p-3">
              <div className="font-semibold mb-2">Afrika</div>
              {LEAGUES.africa.map((lg) => (
                <label
                  key={lg.id}
                  className="flex items-center gap-2 text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={selectedLeagueIds.includes(lg.id)}
                    onChange={() => toggleLeague(lg.id)}
                  />
                  {lg.name}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Status */}
        {status && <div className="text-sm text-emerald-400">{status}</div>}

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={importFromApi}
            disabled={loading}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-slate-900 font-semibold hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "Import läuft…" : "Spieler laden & importieren"}
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