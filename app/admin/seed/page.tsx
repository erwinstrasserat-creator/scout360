"use client";

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
   Typen – nur API-Daten
─────────────────────────────────────────── */

type PlayerFromApi = {
  apiId: number;
  apiTeamId: number | null;

  name: string | null;
  age: number | null;
  nationality: string | null;
  heightCm: number | null;
  position: string | null;
  foot: string | null;
  league: string | null;
  club: string | null;
  onLoan: boolean;
  loanFrom: string | null;
  imageUrl?: string | null;

  stats?: {
    defensiv: number;
    intelligenz: number;
    offensiv: number;
    physis: number;
    technik: number;
    tempo: number;
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

  /* Needs laden (Browser-only) */
  useEffect(() => {
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

  /* Ligen laden (Browser-only) */
  useEffect(() => {
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
        setStatus("❌ Fehler beim Laden der Ligen.");
      } finally {
        setLeaguesLoading(false);
      }
    };

    loadLeagues();
  }, [season]);

  /* Gruppierung + Suche */
  const groupedLeagues: LeagueGroups = useMemo(() => {
    const result: LeagueGroups = {};
    const s = leagueSearch.trim().toLowerCase();

    for (const lg of allLeagues) {
      const txt = (lg.country + " " + lg.name).toLowerCase();
      if (s && !txt.includes(s)) continue;

      if (!result[lg.country]) result[lg.country] = [];
      result[lg.country]!.push(lg);
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

    setStatus("Filter von Need übernommen.");
  };

  /* Filter Helpers */
  const setNumberFilter = (key: keyof NeedFilter, v: string) => {
    if (filterLocked) return;
    const n = v === "" ? null : Number(v);
    setFilter((p) => ({
      ...p,
      [key]: isNaN(n as number) ? null : n,
    }));
  };

  const setTextFilter = (key: keyof NeedFilter, v: string) => {
    if (filterLocked) return;
    setFilter((p) => ({ ...p, [key]: v || null }));
  };

  const setStatsFilter = (key: keyof NeedStats, v: string) => {
    if (filterLocked) return;
    const n = v === "" ? null : Number(v);
    setFilter((p) => ({
      ...p,
      minStats: { ...(p.minStats ?? emptyStats()), [key]: isNaN(n!) ? null : n },
    }));
  };

  const setTraitsFilter = (v: string) => {
    if (filterLocked) return;
    const parts = v.split(",").map((t) => t.trim()).filter(Boolean);
    setFilter((p) => ({
      ...p,
      requiredTraits: parts.length ? parts : null,
    }));
  };

  /* Spielervergleich */
  const matchesFilter = (p: PlayerFromApi): boolean => {
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

    if (filter.requiredTraits?.length) {
      if (!p.traits?.length) return false;
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

  /* IMPORT */
  const importFromApi = async () => {
    if (!selectedLeagueIds.length)
      return setStatus("❌ Bitte mindestens eine Liga auswählen.");

    setLoading(true);
    setStatus("⏳ Lade Spieler…");

    try {
      const res = await fetch("/api/fetchPlayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season, leagueIds: selectedLeagueIds }),
      });

      if (!res.ok) {
        console.error(await res.text());
        return setStatus("❌ Fehler beim Abrufen der API-Daten.");
      }

      const allPlayers: PlayerFromApi[] = await res.json();
      const filtered = allPlayers.filter(matchesFilter);

      setStatus(
        `⏳ Importiere ${filtered.length} von ${allPlayers.length} Spielern…`
      );

      for (const p of filtered) {
        await setDoc(doc(collection(db, "players")), {
          apiId: p.apiId,
          apiTeamId: p.apiTeamId ?? null,

          name: p.name,
          age: p.age,
          nationality: p.nationality,
          heightCm: p.heightCm,
          position: p.position,
          foot: p.foot,
          league: p.league,
          club: p.club,
          onLoan: p.onLoan,
          loanFrom: p.loanFrom,
          imageUrl: p.imageUrl ?? null,

          stats: p.stats ?? {
            offensiv: 0,
            defensiv: 0,
            intelligenz: 0,
            physis: 0,
            technik: 0,
            tempo: 0,
          },

          traits: p.traits ?? [],
        });
      }

      setStatus(`✔️ Import abgeschlossen (${filtered.length} Spieler).`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Unerwarteter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  /* DB löschen */
  const clearDatabase = async () => {
    if (!confirm("ALLE Spieler wirklich löschen?")) return;

    setStatus("⏳ Lösche Spieler…");

    try {
      const snap = await getDocs(collection(db, "players"));
      for (const d of snap.docs) await deleteDoc(d.ref);

      setStatus("✔️ Datenbank geleert.");
    } catch (err) {
      console.error(err);
      setStatus("❌ Fehler beim Löschen.");
    }
  };

  /* UI START */
  const traitsText =
    filter.requiredTraits?.length ? filter.requiredTraits.join(", ") : "";
  const stats = filter.minStats ?? emptyStats();

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold">Spieler Import (Seed)</h2>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-6">
        {/* Need wählen */}
        <div>
          <p className="text-sm text-slate-300">1. Need wählen:</p>
          <select
            value={selectedNeedId}
            onChange={(e) => applyNeed(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full"
          >
            <option value="">Keine Need (manuell)</option>
            {needs.map((n) => (
              <option key={n.id} value={n.id}>
                {n.position ?? "Position"} – Alter {n.minAge ?? "?"}–
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

        {/* Name-Filter */}
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
            3. Filter (Need oder manuell):
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Alter */}
            <div>
              <label className="text-xs text-slate-400">Alter min</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.minAge ?? ""}
                onChange={(e) =>
                  setNumberFilter("minAge", e.target.value)
                }
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Alter max</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.maxAge ?? ""}
                onChange={(e) =>
                  setNumberFilter("maxAge", e.target.value)
                }
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            {/* Größe */}
            <div>
              <label className="text-xs text-slate-400">Größe min</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.heightMin ?? ""}
                onChange={(e) =>
                  setNumberFilter("heightMin", e.target.value)
                }
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Größe max</label>
              <input
                type="number"
                disabled={filterLocked}
                value={filter.heightMax ?? ""}
                onChange={(e) =>
                  setNumberFilter("heightMax", e.target.value)
                }
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              />
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-slate-400">Position (API)</label>
              <input
                type="text"
                disabled={filterLocked}
                value={filter.position ?? ""}
                onChange={(e) => setTextFilter("position", e.target.value)}
                placeholder="Defender, Midfielder…"
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
                  setTextFilter("preferredFoot", e.target.value)
                }
                className="bg-slate-950 border border-slate-700 rounded px-2 py-2 w-full disabled:opacity-60"
              >
                <option value="egal">egal</option>
                <option value="left">links</option>
                <option value="right">rechts</option>
                <option value="both">beidfüßig</option>
              </select>
            </div>

            {/* Traits */}
            <div className="md:col-span-2">
              <label className="text-xs text-slate-400">
                Traits (kommagetrennt)
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
                {(Object.keys(stats) as (keyof NeedStats)[]).map((k) => (
                  <div key={k}>
                    <span className="text-[11px] text-slate-400">{k}</span>
                    <input
                      type="number"
                      disabled={filterLocked}
                      value={stats[k] ?? ""}
                      onChange={(e) => setStatsFilter(k, e.target.value)}
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
              placeholder="Filtern…"
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
                        onChange={() =>
                          setSelectedLeagueIds((prev) =>
                            prev.includes(lg.id)
                              ? prev.filter((n) => n !== lg.id)
                              : [...prev, lg.id]
                          )
                        }
                      />
                      {lg.name}
                    </label>
                  ))}
                </div>
              ))}

              {Object.keys(groupedLeagues).length === 0 && (
                <p className="text-xs text-slate-400">
                  Keine Ligen gefunden.
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