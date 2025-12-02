// app/admin/seed/page.tsx
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

/* ─────────────────────────────────────────
   Typen
─────────────────────────────────────────── */

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
  marketValue?: number | null; // wird manuell im Player-Admin gepflegt
  stats?: {
    defensiv?: number | null;
    intelligenz?: number | null;
    offensiv?: number | null;
    physis?: number | null;
    technik?: number | null;
    tempo?: number | null;
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
  requiredTraits?: string[] | null;
  leagues?: string[] | null;
  minStats?: {
    defensiv?: number | null;
    intelligenz?: number | null;
    offensiv?: number | null;
    physis?: number | null;
    technik?: number | null;
    tempo?: number | null;
  } | null;
};

type NeedFilter = {
  heightMin: number | null;
  heightMax: number | null;
  minAge: number | null;
  maxAge: number | null;
  preferredFoot: string | null;
  position: string | null;
  requiredTraits: string[] | null;
  leagues: string[] | null;
  minStats: {
    defensiv?: number | null;
    intelligenz?: number | null;
    offensiv?: number | null;
    physis?: number | null;
    technik?: number | null;
    tempo?: number | null;
  } | null;
};

/* Helper für leere Stats */
const emptyStats = () => ({
  defensiv: null,
  intelligenz: null,
  offensiv: null,
  physis: null,
  technik: null,
  tempo: null,
});

/* ─────────────────────────────────────────
   Ligen – nach Gruppen
   WICHTIG:
   - IDs mit echten Zahlen sind API-FOOTBALL IDs, die wir schon benutzt haben.
   - IDs mit 0 sind Platzhalter → über /leagues-Endpoint von API-FOOTBALL
     heraussuchen und ersetzen.
─────────────────────────────────────────── */

const LEAGUES: Record<
  string,
  { id: number; name: string }[]
> = {
  // Top 5
  topFive: [
    { id: 39, name: "England – Premier League" },
    { id: 40, name: "England – Championship" },
    { id: 41, name: "England – League One" },

    { id: 78, name: "Deutschland – Bundesliga" },
    { id: 79, name: "Deutschland – 2. Bundesliga" },
    { id: 80, name: "Deutschland – 3. Liga" },

    { id: 135, name: "Italien – Serie A" },
    { id: 136, name: "Italien – Serie B" },
    { id: 138, name: "Italien – Serie C" },

    { id: 140, name: "Spanien – La Liga" },
    { id: 141, name: "Spanien – Segunda División" },

    { id: 61, name: "Frankreich – Ligue 1" },
    { id: 62, name: "Frankreich – Ligue 2" },
  ],

  // Stärkere übrige Ligen Westeuropa
  westEurope: [
    { id: 88, name: "Niederlande – Eredivisie" },
    { id: 89, name: "Niederlande – 2. Liga (Eerste Divisie)" }, // bitte ID prüfen
    { id: 144, name: "Belgien – Pro League" },
    { id: 145, name: "Belgien – 2. Liga (Challenger Pro)" }, // bitte ID prüfen
    { id: 94, name: "Portugal – Primeira Liga" },
    { id: 203, name: "Türkei – Süper Lig" },
    { id: 204, name: "Türkei – TFF 1. Lig" },
  ],

  // DACH, Mittel- & Osteuropa
  centralEast: [
    // Österreich
    { id: 0, name: "Österreich – Bundesliga" },
    { id: 0, name: "Österreich – 2. Liga" },

    // Schweiz
    { id: 179, name: "Schweiz – Super League" },
    { id: 0, name: "Schweiz – Challenge League" },

    // Tschechien
    { id: 0, name: "Tschechien – 1. Liga" },
    { id: 0, name: "Tschechien – 2. Liga" },

    // Slowakei
    { id: 0, name: "Slowakei – 1. Liga" },
    { id: 0, name: "Slowakei – 2. Liga" },

    // Ungarn
    { id: 0, name: "Ungarn – 1. Liga" },

    // Rumänien
    { id: 0, name: "Rumänien – 1. Liga" },
    { id: 0, name: "Rumänien – 2. Liga" },

    // Bulgarien
    { id: 0, name: "Bulgarien – 1. Liga" },
    { id: 0, name: "Bulgarien – 2. Liga" },

    // Ukraine
    { id: 0, name: "Ukraine – 1. Liga" },
  ],

  // Balkan
  balkan: [
    // Kroatien
    { id: 0, name: "Kroatien – 1. Liga" },
    { id: 0, name: "Kroatien – 2. Liga" },

    // Slowenien
    { id: 0, name: "Slowenien – 1. Liga" },
    { id: 0, name: "Slowenien – 2. Liga" },

    // Serbien
    { id: 45, name: "Serbien – SuperLiga" },
    { id: 0, name: "Serbien – 2. Liga" },

    // Bosnien
    { id: 0, name: "Bosnien – 1. Liga" },

    // Montenegro
    { id: 0, name: "Montenegro – 1. Liga" },
  ],

  // Griechenland, Zypern
  southEurope: [
    { id: 0, name: "Griechenland – 1. Liga" },
    { id: 0, name: "Griechenland – 2. Liga" },
    { id: 0, name: "Zypern – 1. Liga" },
  ],

  // Norden / Inseln
  nordicsIsles: [
    // Schweden
    { id: 87, name: "Schweden – Allsvenskan" },
    { id: 0, name: "Schweden – 2. Liga" },

    // Norwegen
    { id: 0, name: "Norwegen – 1. Liga" },
    { id: 0, name: "Norwegen – 2. Liga" },

    // Finnland
    { id: 0, name: "Finnland – 1. Liga" },

    // Schottland
    { id: 96, name: "Schottland – Premiership" },
    { id: 0, name: "Schottland – 2. Liga" },

    // Wales
    { id: 0, name: "Wales – 1. Liga" },
    { id: 0, name: "Wales – 2. Liga" },
  ],

  // Baltikum
  baltic: [
    { id: 0, name: "Estland – 1. Liga" },
    { id: 0, name: "Lettland – 1. Liga" },
    { id: 0, name: "Litauen – 1. Liga" },
  ],

  // Asien & Afrika wie vorher
  asia: [
    { id: 98, name: "Japan – J-League" },
    { id: 292, name: "Südkorea – K-League 1" },
  ],
  africa: [
    { id: 233, name: "Ägypten – Premier League" },
    { id: 196, name: "Südafrika – Premier Division" },
    { id: 200, name: "Marokko – Botola Pro" },
  ],
};

const SEASONS = [2023, 2024, 2025, 2026];

/* ─────────────────────────────────────────
   Component
─────────────────────────────────────────── */

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
    requiredTraits: null,
    leagues: null,
    minStats: emptyStats(),
  });

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filterLocked = selectedNeedId !== "";

  /* Needs laden */
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "needs"));
      setNeeds(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    };
    load();
  }, []);

  /* Need übernehmen */
  const applyNeed = (id: string) => {
    setSelectedNeedId(id);

    if (!id) {
      // zurück zu manueller Filter-Eingabe
      setFilter({
        heightMin: null,
        heightMax: null,
        minAge: null,
        maxAge: null,
        preferredFoot: null,
        position: null,
        requiredTraits: null,
        leagues: null,
        minStats: emptyStats(),
      });
      setStatus("Manuelle Filter aktiv.");
      return;
    }

    const nd = needs.find((n) => n.id === id);
    if (!nd) return;

    setFilter({
      heightMin: nd.heightMin ?? null,
      heightMax: nd.heightMax ?? null,
      minAge: nd.minAge ?? null,
      maxAge: nd.maxAge ?? null,
      preferredFoot: nd.preferredFoot ?? null,
      position: nd.position ?? null,
      requiredTraits: nd.requiredTraits ?? null,
      leagues: nd.leagues ?? null,
      minStats: nd.minStats ?? emptyStats(),
    });

    setStatus("Filter aus Need übernommen (Bearbeitung auf Seed-Seite gesperrt).");
  };

  /* Ligen togglen */
  const toggleLeague = (id: number) => {
    setSelectedLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  /* Filter-Helpers für Inputs (nur aktiv, wenn keine Need gewählt) */

  const setNumberFilter = (key: keyof NeedFilter, value: string) => {
    if (filterLocked) return;
    const num = value === "" ? null : Number(value);
    setFilter((prev) => ({
      ...prev,
      [key]: isNaN(num as number) ? null : num,
    }));
  };

  const setTextFilter = (key: keyof NeedFilter, value: string) => {
    if (filterLocked) return;
    setFilter((prev) => ({
      ...prev,
      [key]: value || null,
    }));
  };

  const setStatsFilter = (
    key: keyof NonNullable<NeedFilter["minStats"]>,
    value: string
  ) => {
    if (filterLocked) return;
    const num = value === "" ? null : Number(value);
    setFilter((prev) => ({
      ...prev,
      minStats: {
        ...(prev.minStats ?? emptyStats()),
        [key]: isNaN(num as number) ? null : num,
      },
    }));
  };

  const setTraitsFilter = (value: string) => {
    if (filterLocked) return;
    const parts = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setFilter((prev) => ({
      ...prev,
      requiredTraits: parts.length ? parts : null,
    }));
  };

  /* Prüfen, ob Spieler zum Filter passt */
  const matchesFilter = (p: Player): boolean => {
    if (excludeLoans && p.onLoan) return false;

    // Alter
    if (filter.minAge !== null && (p.age ?? 0) < filter.minAge) return false;
    if (filter.maxAge !== null && (p.age ?? 0) > filter.maxAge) return false;

    // Größe
    if (filter.heightMin !== null && (p.heightCm ?? 0) < filter.heightMin)
      return false;
    if (filter.heightMax !== null && (p.heightCm ?? 0) > filter.heightMax)
      return false;

    // Position
    if (filter.position) {
      const pos = p.position?.toLowerCase() ?? "";
      if (!pos.includes(filter.position.toLowerCase())) return false;
    }

    // bevorzugter Fuß
    if (
      filter.preferredFoot &&
      filter.preferredFoot.toLowerCase() !== "egal" &&
      p.foot
    ) {
      if (p.foot.toLowerCase() !== filter.preferredFoot.toLowerCase()) {
        return false;
      }
    }

    // Traits
    if (filter.requiredTraits && filter.requiredTraits.length > 0) {
      if (!p.traits || p.traits.length === 0) return false;
      const lower = p.traits.map((t) => t.toLowerCase());
      for (const t of filter.requiredTraits) {
        if (!lower.includes(t.toLowerCase())) return false;
      }
    }

    // Min-Stats
    if (filter.minStats && p.stats) {
      const keys = Object.keys(filter.minStats) as (keyof typeof filter.minStats)[];
      for (const key of keys) {
        const min = filter.minStats![key];
        if (typeof min === "number") {
          const pv = (p.stats as any)[key] ?? 0;
          if (pv < min) return false;
        }
      }
    }

    return true;
  };

  /* Import aus API */
  const importFromApi = async () => {
    if (!selectedLeagueIds.length) {
      return setStatus("❌ Bitte mindestens eine Liga auswählen.");
    }

    setLoading(true);
    setStatus("⏳ Lade Spieler aus API-Football…");

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
        setStatus("❌ Fehler beim Abrufen der Spieler.");
        setLoading(false);
        return;
      }

      const allPlayers: Player[] = await res.json();
      const filtered = allPlayers.filter(matchesFilter);

      setStatus(
        `⏳ Importiere ${filtered.length} von ${allPlayers.length} Spielern in Firestore…`
      );

      for (const p of filtered) {
        await setDoc(doc(collection(db, "players")), p);
      }

      setStatus(`✔️ Import abgeschlossen (${filtered.length} Spieler gespeichert).`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Unerwarteter Fehler beim Import.");
    } finally {
      setLoading(false);
    }
  };

  /* Datenbank löschen */
  const clearDatabase = async () => {
    if (!confirm("Alle Spieler in 'players' löschen?")) return;

    setStatus("⏳ Lösche Spieler…");

    const snap = await getDocs(collection(db, "players"));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }

    setStatus("✔️ Datenbank geleert.");
  };

  /* UI */

  const traitsText =
    filter.requiredTraits && filter.requiredTraits.length
      ? filter.requiredTraits.join(", ")
      : "";

  const stats = filter.minStats ?? emptyStats();

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold">Spieler Import (Seed)</h2>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
        {/* 1. Need wählen */}
        <div className="space-y-2">
          <p className="text-sm text-slate-300">1. Need wählen:</p>
          <select
            value={selectedNeedId}
            onChange={(e) => applyNeed(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
          >
            <option value="">Keine Need (Filter manuell setzen)</option>
            {needs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.position ?? "Position"} – Alter {n.minAge ?? "?"}-
                {n.maxAge ?? "?"}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Saison */}
        <div className="space-y-2">
          <p className="text-sm text-slate-300">2. Saison:</p>
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

        {/* 3. Filter (manuell, wenn keine Need) */}
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            3. Filter (werden von Need übernommen – sonst manuell setzen):
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Alter */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Alter min</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.minAge ?? ""}
                onChange={(e) => setNumberFilter("minAge", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Alter max</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.maxAge ?? ""}
                onChange={(e) => setNumberFilter("maxAge", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            {/* Größe */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Größe min (cm)</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.heightMin ?? ""}
                onChange={(e) => setNumberFilter("heightMin", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Größe max (cm)</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.heightMax ?? ""}
                onChange={(e) => setNumberFilter("heightMax", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            {/* Position */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Position (Textsuche)</label>
              <input
                type="text"
                disabled={filterLocked}
                value={filter.position ?? ""}
                onChange={(e) => setTextFilter("position", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            {/* Fuß */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Bevorzugter Fuß</label>
              <select
                disabled={filterLocked}
                value={filter.preferredFoot ?? "egal"}
                onChange={(e) =>
                  setTextFilter("preferredFoot", e.target.value || "egal")
                }
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              >
                <option value="egal">egal</option>
                <option value="rechts">rechts</option>
                <option value="links">links</option>
                <option value="beide">beidfüßig</option>
              </select>
            </div>

            {/* Traits */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-slate-400">
                Benötigte Traits (kommagetrennt, optional)
              </label>
              <input
                type="text"
                disabled={filterLocked}
                value={traitsText}
                onChange={(e) => setTraitsFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            {/* Stats */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-slate-400">Minimum-Stats</label>
              <div className="grid md:grid-cols-3 gap-3">
                {(
                  [
                    "defensiv",
                    "intelligenz",
                    "offensiv",
                    "physis",
                    "technik",
                    "tempo",
                  ] as const
                ).map((key) => (
                  <div key={key} className="space-y-1">
                    <span className="text-[11px] text-slate-400">{key}</span>
                    <input
                      type="number"
                      disabled={filterLocked}
                      value={stats[key] ?? ""}
                      onChange={(e) => setStatsFilter(key, e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leihspieler */}
        <div>
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={excludeLoans}
              onChange={() => setExcludeLoans((p) => !p)}
            />
            Leihspieler ausschließen
          </label>
        </div>

        {/* Ligen */}
        <div className="space-y-3">
          <p className="text-sm text-slate-300">4. Ligen auswählen:</p>
          <div className="grid lg:grid-cols-2 gap-4 text-sm">
            {Object.entries(LEAGUES).map(([groupKey, leagues]) => (
              <div
                key={groupKey}
                className="border border-slate-800 rounded-lg p-3"
              >
                <div className="font-semibold mb-2">
                  {groupKey === "topFive"
                    ? "Top-5-Ligen"
                    : groupKey === "westEurope"
                    ? "West-Europa"
                    : groupKey === "centralEast"
                    ? "Zentraleuropa / Osten"
                    : groupKey === "balkan"
                    ? "Balkan"
                    : groupKey === "southEurope"
                    ? "Süd-Europa"
                    : groupKey === "nordicsIsles"
                    ? "Nordics & Inseln"
                    : groupKey === "baltic"
                    ? "Baltikum"
                    : groupKey === "asia"
                    ? "Asien"
                    : groupKey === "africa"
                    ? "Afrika"
                    : groupKey}
                </div>

                {leagues.map((lg) => (
                  <label
                    key={`${groupKey}-${lg.id}-${lg.name}`}
                    className="flex items-center gap-2 text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeagueIds.includes(lg.id)}
                      onChange={() => toggleLeague(lg.id)}
                    />
                    {lg.name}
                    {lg.id === 0 && (
                      <span className="text-[10px] text-amber-400">
                        (ID in .env/Code noch setzen)
                      </span>
                    )}
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="text-emerald-400 text-sm border border-emerald-700/40 bg-emerald-900/10 rounded px-3 py-2">
            {status}
          </div>
        )}

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