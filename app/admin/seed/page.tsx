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
  stats?: any;
  traits?: string[];
  marketScore?: number;
  marketValueEstimate?: number;
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
  minStats?: any | null;
};

type NeedFilter = {
  heightMin: number | null;
  heightMax: number | null;
  minAge: number | null;
  maxAge: number | null;
  preferredFoot: string | null;
  position: string | null;
  requiredTraits: string[] | null;
  minStats: any | null;
  leagues: string[] | null;
};

/* ─────────────────────────────────────────
   Ligen (ID = API-Football)
─────────────────────────────────────────── */

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
    { id: 87, name: "Superligan (Schweden)" },
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
    preferredFoot: "",
    position: "",
    requiredTraits: null,
    minStats: null,
    leagues: null,
  });

  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasNeedSelected = !!selectedNeedId;

  /* Needs laden */
  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "needs"));
      setNeeds(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    };
    load();
  }, []);

  /* Need übernehmen → Filter befüllen + sperren */
  const applyNeed = (id: string) => {
    setSelectedNeedId(id);
    const nd = needs.find((n) => n.id === id);
    if (!nd) {
      // Need entfernt → Filter leeren
      setFilter({
        heightMin: null,
        heightMax: null,
        minAge: null,
        maxAge: null,
        preferredFoot: "",
        position: "",
        requiredTraits: null,
        minStats: null,
        leagues: null,
      });
      setStatus(null);
      return;
    }

    setFilter({
      heightMin: nd.heightMin ?? null,
      heightMax: nd.heightMax ?? null,
      minAge: nd.minAge ?? null,
      maxAge: nd.maxAge ?? null,
      preferredFoot: nd.preferredFoot ?? "",
      position: nd.position ?? "",
      requiredTraits: nd.requiredTraits ?? null,
      leagues: nd.leagues ?? null,
      minStats: nd.minStats ?? null,
    });

    setStatus("Filter aus Need übernommen (Felder gesperrt).");
  };

  /* Ligen togglen */
  const toggleLeague = (id: number) => {
    setSelectedLeagueIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  /* Filter-Helper fürs Manual-Edit (wenn kein Need gewählt) */
  const updateFilterField = (field: keyof NeedFilter, value: any) => {
    if (hasNeedSelected) return; // bei aktivem Need nicht überschreiben
    setFilter((prev) => ({ ...prev, [field]: value }));
  };

  /* Spieler-Filter */
  const matchesFilter = (p: Player): boolean => {
    if (excludeLoans && p.onLoan) return false;

    const { minAge, maxAge, heightMin, heightMax, position, preferredFoot } =
      filter;

    if (minAge !== null && (p.age ?? 0) < minAge) return false;
    if (maxAge !== null && (p.age ?? 0) > maxAge) return false;

    if (heightMin !== null && (p.heightCm ?? 0) < heightMin) return false;
    if (heightMax !== null && (p.heightCm ?? 0) > heightMax) return false;

    if (position && position.trim() !== "") {
      if (!p.position?.toLowerCase().includes(position.toLowerCase()))
        return false;
    }

    if (
      preferredFoot &&
      preferredFoot !== "" &&
      preferredFoot.toLowerCase() !== "egal"
    ) {
      const pf = preferredFoot.toLowerCase();
      if (!p.foot || p.foot.toLowerCase() !== pf) return false;
    }

    // Traits / minStats könntest du später hier wieder aktivieren

    return true;
  };

  /* Import aus API-Football */
  const importFromApi = async () => {
    if (!selectedLeagueIds.length) {
      return setStatus("❌ Bitte mindestens eine Liga auswählen.");
    }

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
    } finally {
      setLoading(false);
    }
  };

  /* Datenbank leeren */
  const clearDatabase = async () => {
    if (!confirm("Alle Spieler löschen?")) return;

    setStatus("⏳ Lösche Spieler…");

    const snap = await getDocs(collection(db, "players"));
    for (const d of snap.docs) await deleteDoc(d.ref);

    setStatus("✔️ Datenbank geleert.");
  };

  /* UI */
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
            <option value="">Keine Need (Filter manuell setzen)</option>
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

        {/* Filter-Block (immer sichtbar) */}
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            3. Filter (werden von Need übernommen – sonst manuell setzen):
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Alter */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Alter min / max</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filter.minAge ?? ""}
                  onChange={(e) =>
                    updateFilterField(
                      "minAge",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={hasNeedSelected}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full"
                />
                <input
                  type="number"
                  value={filter.maxAge ?? ""}
                  onChange={(e) =>
                    updateFilterField(
                      "maxAge",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={hasNeedSelected}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full"
                />
              </div>
            </div>

            {/* Größe */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Größe min / max (cm)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={filter.heightMin ?? ""}
                  onChange={(e) =>
                    updateFilterField(
                      "heightMin",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={hasNeedSelected}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full"
                />
                <input
                  type="number"
                  value={filter.heightMax ?? ""}
                  onChange={(e) =>
                    updateFilterField(
                      "heightMax",
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={hasNeedSelected}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full"
                />
              </div>
            </div>

            {/* Position */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Position (Textsuche)</label>
              <input
                type="text"
                value={filter.position ?? ""}
                onChange={(e) => updateFilterField("position", e.target.value)}
                disabled={hasNeedSelected}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full"
              />
            </div>

            {/* Bevorzugter Fuß */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Bevorzugter Fuß</label>
              <select
                value={filter.preferredFoot ?? ""}
                onChange={(e) =>
                  updateFilterField("preferredFoot", e.target.value || "")
                }
                disabled={hasNeedSelected}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full"
              >
                <option value="">egal</option>
                <option value="rechts">rechts</option>
                <option value="links">links</option>
                <option value="beide">beidfüßig</option>
              </select>
            </div>

            {/* Traits (kommagetrennt) */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-slate-400">
                Benötigte Traits (kommagetrennt, optional)
              </label>
              <input
                type="text"
                value={(filter.requiredTraits ?? []).join(", ")}
                onChange={(e) =>
                  updateFilterField(
                    "requiredTraits",
                    e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                  )
                }
                disabled={hasNeedSelected}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 w-full"
              />
            </div>
          </div>
        </div>

        {/* Leihspieler-Option */}
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

        {/* Ligen auswählen */}
        <div>
          <p className="text-sm text-slate-300">4. Ligen auswählen:</p>

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