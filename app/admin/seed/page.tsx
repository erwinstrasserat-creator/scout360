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

/* ---------------------------------------------------------
   🔵 TYPE DEFINITIONS
--------------------------------------------------------- */

type Player = {
  apiId: number;
  name: string | null;
  age: number | null;
  heightCm: number | null;
  position: string | null;
  foot: string | null;
  league: string | null;
  club: string | null;
  onLoan: boolean;
  loanFrom: string | null;
  stats?: any;
  traits?: string[];
};

type NeedDoc = {
  id: string;
  position: string | null;
  minAge: number | null;
  maxAge: number | null;
  heightMin: number | null;
  heightMax: number | null;
  preferredFoot: string | null;
  requiredTraits: string[];
  leagues: string[];
  minStats: any | null;
};

type NeedFilter = {
  heightMin: number | null;
  heightMax: number | null;
  minAge: number | null;
  maxAge: number | null;
  preferredFoot: string | null;
  position: string | null;
  requiredTraits: string[];
  minStats: any | null;
  leagues: string[];
};

/* ---------------------------------------------------------
   🔵 LEAGUES (Extended)
--------------------------------------------------------- */

const LEAGUES = {
  england: [
    { id: 39, name: "Premier League" },
    { id: 40, name: "Championship" },
    { id: 41, name: "League One" },
  ],
  germany: [
    { id: 78, name: "Bundesliga" },
    { id: 79, name: "2. Bundesliga" },
    { id: 80, name: "3. Liga" },
  ],
  italy: [
    { id: 135, name: "Serie A" },
    { id: 136, name: "Serie B" },
    { id: 138, name: "Serie C" },
  ],
  spain: [
    { id: 140, name: "La Liga" },
    { id: 141, name: "Segunda División" },
  ],
  france: [
    { id: 61, name: "Ligue 1" },
    { id: 62, name: "Ligue 2" },
  ],
  turkey: [
    { id: 203, name: "Süper Lig" },
    { id: 204, name: "TFF 1. Lig" },
  ],
  restEurope: [
    { id: 88, name: "Eredivisie (Niederlande)" },
    { id: 94, name: "Primeira Liga (Portugal)" },
    { id: 144, name: "Pro League (Belgien)" },
    { id: 218, name: "Superliga (Dänemark)" },
    { id: 87, name: "Superligaen (Schweden)" },
    { id: 96, name: "Premiership (Schottland)" },
    { id: 179, name: "Super League (Schweiz)" },
    { id: 45, name: "Superliga (Serbien)" },
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

/* ---------------------------------------------------------
   🔵 COMPONENT
--------------------------------------------------------- */

export default function AdminSeedPage() {
  const [needs, setNeeds] = useState<NeedDoc[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState("");

  const [season, setSeason] = useState(2025);
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>([]);
  const [excludeLoans, setExcludeLoans] = useState(false);

  const [filter, setFilter] = useState<NeedFilter>({
    heightMin: null,
    heightMax: null,
    minAge: null,
    maxAge: null,
    preferredFoot: null,
    position: null,
    requiredTraits: [],
    minStats: null,
    leagues: [],
  });

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------------
     🔵 Load Needs (with automatic normalization)
  --------------------------------------------------------- */
  useEffect(() => {
    const loadNeeds = async () => {
      const snap = await getDocs(collection(db, "needs"));

      const cleaned = snap.docs.map((d) => {
        const n = d.data() as any;

        return {
          id: d.id,
          position: n.position ?? null,
          minAge: n.minAge ?? null,
          maxAge: n.maxAge ?? null,
          heightMin: n.heightMin ?? null,
          heightMax: n.heightMax ?? null,
          preferredFoot: n.preferredFoot ?? null,

          requiredTraits: Array.isArray(n.requiredTraits)
            ? n.requiredTraits
            : [],

          leagues: Array.isArray(n.leagues) ? n.leagues : [],

          minStats:
            n.minStats && typeof n.minStats === "object" ? n.minStats : null,
        } as NeedDoc;
      });

      setNeeds(cleaned);
    };

    loadNeeds();
  }, []);

  /* ---------------------------------------------------------
     🔵 Apply Need To Filter
  --------------------------------------------------------- */
  const applyNeed = (id: string) => {
    setSelectedNeedId(id);
    const nd = needs.find((n) => n.id === id);
    if (!nd) return;

    setFilter({
      heightMin: nd.heightMin,
      heightMax: nd.heightMax,
      minAge: nd.minAge,
      maxAge: nd.maxAge,
      preferredFoot: nd.preferredFoot,
      position: nd.position,
      requiredTraits: nd.requiredTraits,
      minStats: nd.minStats,
      leagues: nd.leagues,
    });

    setStatus("Filter aus Need übernommen.");
  };

  /* ---------------------------------------------------------
     🔵 Toggle League
  --------------------------------------------------------- */
  const toggleLeague = (id: number) => {
    setSelectedLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  /* ---------------------------------------------------------
     🔵 Filter Logic
  --------------------------------------------------------- */
  const matchesFilter = (p: Player): boolean => {
    if (excludeLoans && p.onLoan) return false;

    if (filter.minAge !== null && (p.age ?? 0) < filter.minAge) return false;
    if (filter.maxAge !== null && (p.age ?? 0) > filter.maxAge) return false;

    if (filter.heightMin !== null && (p.heightCm ?? 0) < filter.heightMin)
      return false;
    if (filter.heightMax !== null && (p.heightCm ?? 0) > filter.heightMax)
      return false;

    if (filter.position) {
      if (!p.position?.toLowerCase().includes(filter.position.toLowerCase()))
        return false;
    }

    return true;
  };

  /* ---------------------------------------------------------
     🔵 Import From API
  --------------------------------------------------------- */
  const importFromApi = async () => {
    if (!selectedLeagueIds.length)
      return setStatus("❌ Bitte mindestens eine Liga auswählen.");

    setLoading(true);
    setStatus("⏳ Lade Spieler…");

    try {
      const res = await fetch("/api/fetchPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season,
          leagueIds: selectedLeagueIds,
        }),
      });

      if (!res.ok) {
        console.error(await res.text());
        setStatus("❌ Fehler beim Abrufen.");
        setLoading(false);
        return;
      }

      const allPlayers: Player[] = await res.json();
      const filtered = allPlayers.filter(matchesFilter);

      setStatus(
        `⏳ Importiere ${filtered.length} von ${allPlayers.length} Spielern…`
      );

      for (const p of filtered) {
        await setDoc(doc(collection(db, "players")), p);
      }

      setStatus(`✔️ Import abgeschlossen (${filtered.length} gespeichert).`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Fehler beim Import.");
    }

    setLoading(false);
  };

  /* ---------------------------------------------------------
     🔵 Delete database
  --------------------------------------------------------- */
  const clearDatabase = async () => {
    if (!confirm("Alle Spieler löschen?")) return;

    setStatus("⏳ Lösche Spieler…");

    const snap = await getDocs(collection(db, "players"));
    for (const d of snap.docs) await deleteDoc(d.ref);

    setStatus("✔️ Datenbank geleert.");
  };

  /* ---------------------------------------------------------
     🔵 UI
  --------------------------------------------------------- */
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold">Spieler Import (Seed)</h2>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
        {/* NEED Auswahl */}
        <div>
          <p className="text-sm text-slate-300">1. Need wählen:</p>
          <select
            value={selectedNeedId}
            onChange={(e) => applyNeed(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
          >
            <option value="">Keine Need</option>
            {needs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.position ?? "Position"} – Alter {n.minAge ?? "?"}-
                {n.maxAge ?? "?"}
              </option>
            ))}
          </select>
        </div>

        {/* Season */}
        <div>
          <p className="text-sm text-slate-300">2. Saison:</p>
          <select
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
          >
            {SEASONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Loan checkbox */}
        <div>
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={excludeLoans}
              onChange={() => setExcludeLoans((v) => !v)}
            />
            Leihspieler ausschließen
          </label>
        </div>

        {/* League Selection */}
        <div>
          <p className="text-sm text-slate-300">3. Ligen auswählen:</p>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(LEAGUES).map(([group, leagues]) => (
              <div
                key={group}
                className="border border-slate-800 rounded-lg p-3"
              >
                <div className="font-semibold mb-2 capitalize">{group}</div>
                {leagues.map((lg) => (
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
            ))}
          </div>
        </div>

        {/* Status */}
        {status && <div className="text-emerald-400 text-sm">{status}</div>}

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={importFromApi}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 px-4 py-2 rounded font-semibold text-slate-900 disabled:opacity-50"
          >
            {loading ? "Importiere…" : "Spieler importieren"}
          </button>

          <button
            onClick={clearDatabase}
            className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded font-semibold text-slate-900"
          >
            Datenbank leeren
          </button>
        </div>
      </div>
    </div>
  );
}