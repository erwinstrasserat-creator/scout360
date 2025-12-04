"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useEffect, useMemo, useState } from "react";
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
  marketValue?: number | null;
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

type NeedStats = {
  defensiv: number | null;
  intelligenz: number | null;
  offensiv: number | null;
  physis: number | null;
  technik: number | null;
  tempo: number | null;
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
  minStats?: Partial<NeedStats> | null;
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
  minStats: NeedStats | null;
};

type LeagueItem = {
  id: number;
  name: string;
  country: string;
  type: string | null;
  logo?: string | null;
};

type LeagueGroups = Record<string, LeagueItem[]>;

/* helper */
const emptyStats = (): NeedStats => ({
  defensiv: null,
  intelligenz: null,
  offensiv: null,
  physis: null,
  technik: null,
  tempo: null,
});

const SEASONS = [2023, 2024, 2025, 2026];

/* ─────────────────────────────────────────
   Component
─────────────────────────────────────────── */

export default function AdminSeedPage() {
  const [needs, setNeeds] = useState<NeedDoc[]>([]);
  const [selectedNeedId, setSelectedNeedId] = useState("");

  const [season, setSeason] = useState(2025);

  const [allLeagues, setAllLeagues] = useState<LeagueItem[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState("");

  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>([]);
  const [excludeLoans, setExcludeLoans] = useState(false);
  const [nameFilter, setNameFilter] = useState("");

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

  /* Needs laden (nur im Browser) */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadNeeds = async () => {
      try {
        const snap = await getDocs(collection(db, "needs"));
        setNeeds(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (err) {
        console.error("Fehler beim Laden der Needs:", err);
      }
    };

    loadNeeds();
  }, []);

  /* Ligen von API-Football laden (nur im Browser sinnvoll) */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadLeagues = async () => {
      setLeaguesLoading(true);
      try {
        const res = await fetch(`/api/leagues?season=${season}`);
        if (!res.ok) {
          console.error(await res.text());
          setStatus("❌ Fehler beim Laden der Ligen.");
          return;
        }
        const data: LeagueItem[] = await res.json();
        setAllLeagues(data);
      } catch (err) {
        console.error(err);
        setStatus("❌ Unerwarteter Fehler beim Laden der Ligen.");
      } finally {
        setLeaguesLoading(false);
      }
    };

    loadLeagues();
  }, [season]);

  /* Ligen gruppiert nach Land + Suche */
  const groupedLeagues: LeagueGroups = useMemo(() => {
    const result: LeagueGroups = {};

    const search = leagueSearch.trim().toLowerCase();

    for (const lg of allLeagues) {
      const text = (lg.country + " " + lg.name).toLowerCase();
      if (search && !text.includes(search)) continue;

      if (!result[lg.country]) result[lg.country] = [];
      result[lg.country].push(lg);
    }

    for (const country of Object.keys(result)) {
      result[country].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [allLeagues, leagueSearch]);

  /* Need übernehmen */
  const applyNeed = (id: string) => {
    setSelectedNeedId(id);

    if (!id) {
      // Manuelle Eingabe wieder freigeben
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

    const minStats: NeedStats = {
      ...emptyStats(),
      ...(nd.minStats || {}),
    };

    setFilter({
      heightMin: nd.heightMin ?? null,
      heightMax: nd.heightMax ?? null,
      minAge: nd.minAge ?? null,
      maxAge: nd.maxAge ?? null,
      preferredFoot: nd.preferredFoot ?? null,
      position: nd.position ?? null,
      requiredTraits: nd.requiredTraits ?? null,
      leagues: nd.leagues ?? null,
      minStats,
    });

    setStatus("Filter aus Need übernommen (Bearbeitung gesperrt).");
  };

  /* Ligen togglen */
  const toggleLeague = (id: number) => {
    setSelectedLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  /* Filter-Setter */
  const setNumberFilter = (key: keyof NeedFilter, value: string) => {
    if (filterLocked) return;
    const num = value === "" ? null : Number(value);
    setFilter((prev) => ({ ...prev, [key]: isNaN(num as number) ? null : num }));
  };

  const setTextFilter = (key: keyof NeedFilter, value: string) => {
    if (filterLocked) return;
    setFilter((prev) => ({ ...prev, [key]: value || null }));
  };

  const setStatsFilter = (key: keyof NeedStats, value: string) => {
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

  /* Spieler Filter */
  const matchesFilter = (p: Player): boolean => {
    if (excludeLoans && p.onLoan) return false;

    if (nameFilter && !p.name?.toLowerCase().includes(nameFilter.toLowerCase()))
      return false;

    if (filter.minAge !== null && (p.age ?? 0) < filter.minAge) return false;
    if (filter.maxAge !== null && (p.age ?? 0) > filter.maxAge) return false;

    if (filter.heightMin !== null && (p.heightCm ?? 0) < filter.heightMin)
      return false;
    if (filter.heightMax !== null && (p.heightCm ?? 0) > filter.heightMax)
      return false;

    if (filter.position) {
      const pos = p.position?.toLowerCase() ?? "";
      if (!pos.includes(filter.position.toLowerCase())) return false;
    }

    if (
      filter.preferredFoot &&
      filter.preferredFoot !== "egal" &&
      p.foot &&
      p.foot.toLowerCase() !== filter.preferredFoot.toLowerCase()
    ) {
      return false;
    }

    if (filter.requiredTraits && filter.requiredTraits.length) {
      if (!p.traits || p.traits.length === 0) return false;
      const lower = p.traits.map((t) => t.toLowerCase());
      for (const t of filter.requiredTraits) {
        if (!lower.includes(t.toLowerCase())) return false;
      }
    }

    if (filter.minStats && p.stats) {
      for (const key of Object.keys(filter.minStats) as (keyof NeedStats)[]) {
        const min = filter.minStats[key];
        if (typeof min === "number") {
          const val = p.stats[key] ?? 0;
          if (val < min) return false;
        }
      }
    }

    return true;
  };

  /* Import */
  const importFromApi = async () => {
    if (typeof window === "undefined") {
      setStatus("❌ Import ist nur im Browser möglich.");
      return;
    }

    if (!selectedLeagueIds.length) {
      return setStatus("❌ Bitte mindestens eine Liga auswählen.");
    }

    setLoading(true);
    setStatus("⏳ Lade Spieler aus API-Football…");

    try {
      const res = await fetch("/api/fetchPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, leagueIds: selectedLeagueIds }),
      });

      if (!res.ok) {
        console.error(await res.text());
        setStatus("❌ Fehler beim Abrufen der Spieler.");
        return;
      }

      const allPlayers: Player[] = await res.json();

      console.log("API-Spieler empfangen:", allPlayers.length);
      const filtered = allPlayers.filter(matchesFilter);
      console.log("Nach Filter:", filtered.length);

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

  /* DB löschen */
  const clearDatabase = async () => {
    if (typeof window === "undefined") {
      setStatus("❌ Löschen ist nur im Browser möglich.");
      return;
    }

    if (!confirm("Alle Spieler in 'players' löschen?")) return;

    setStatus("⏳ Lösche Spieler…");

    try {
      const snap = await getDocs(collection(db, "players"));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
      setStatus("✔️ Datenbank geleert.");
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      setStatus("❌ Fehler beim Löschen der Datenbank.");
    }
  };

  /* UI START */
  const traitsText =
    filter.requiredTraits && filter.requiredTraits.length
      ? filter.requiredTraits.join(", ")
      : "";

  const stats = filter.minStats ?? emptyStats();

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold">Spieler Import (Seed)</h2>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
        {/* Need Auswahl */}
        <div>
          <p className="text-sm text-slate-300">1. Need wählen:</p>
          <select
            value={selectedNeedId}
            onChange={(e) => applyNeed(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
          >
            <option value="">Keine Need (manuelle Filter)</option>
            {needs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.position ?? "Position"} – Alter {n.minAge ?? "?"}-
                {n.maxAge ?? "?"}
              </option>
            ))}
          </select>
        </div>

        {/* Saison */}
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

        {/* Name Filter */}
        <div>
          <p className="text-sm text-slate-300">Spielername enthält:</p>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
            placeholder="optional"
          />
        </div>

        {/* Filter */}
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            3. Filter (von Need übernommen, sonst manuell):
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Alter */}
            <div>
              <label className="text-xs text-slate-400">Alter min</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.minAge ?? ""}
                onChange={(e) => setNumberFilter("minAge", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            <div>
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
            <div>
              <label className="text-xs text-slate-400">Größe min (cm)</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.heightMin ?? ""}
                onChange={(e) => setNumberFilter("heightMin", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            <div>
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
            <div>
              <label className="text-xs text-slate-400">Position</label>
              <input
                type="text"
                disabled={filterLocked}
                value={filter.position ?? ""}
                onChange={(e) => setTextFilter("position", e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            {/* Fuß */}
            <div>
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
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">
                Benötigte Traits (kommagetrennt)
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
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">Minimum-Stats</label>
              <div className="grid md:grid-cols-3 gap-3">
                {(Object.keys(stats) as (keyof NeedStats)[]).map((key) => (
                  <div key={key}>
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

        {/* Loans */}
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
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-300">4. Ligen auswählen:</p>
            <input
              type="text"
              value={leagueSearch}
              onChange={(e) => setLeagueSearch(e.target.value)}
              placeholder="Länder / Ligen filtern…"
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm w-64"
            />
          </div>

          {leaguesLoading && (
            <p className="text-xs text-slate-400">Lade Ligen…</p>
          )}

          {!leaguesLoading && (
            <div className="grid lg:grid-cols-2 gap-4 text-sm max-h-[400px] overflow-auto pr-2">
              {Object.entries(groupedLeagues).map(([country, leagues]) => (
                <div
                  key={country}
                  className="border border-slate-800 rounded-lg p-3"
                >
                  <div className="font-semibold mb-2">{country}</div>
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
              {Object.keys(groupedLeagues).length === 0 && (
                <p className="text-xs text-slate-400">
                  Keine Ligen für diesen Filter gefunden.
                </p>
              )}
            </div>
          )}
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