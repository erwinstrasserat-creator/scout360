"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Player } from "../lib/types";
import { PlayerCard } from "../components/PlayerCard";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // FILTER STATES
  const [search, setSearch] = useState("");
  const [maxAge, setMaxAge] = useState<number | "">(23);
  const [positionFilter, setPositionFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [nationFilter, setNationFilter] = useState("");
  const [footFilter, setFootFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  // --- Auth Guard ---
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Wenn noch geprüft wird oder kein User -> nichts laden
  useEffect(() => {
    if (!user) return;

    const fetchPlayers = async () => {
      try {
        const snap = await getDocs(collection(db, "players"));
        const docs: Player[] = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Player, "id">),
        }));
        setPlayers(docs);
      } catch (e) {
        console.error(e);
        setError("Fehler beim Laden der Spieler.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      const bottom =
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 200;

      if (bottom) {
        setVisibleCount((prev) => prev + 20);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const positions = useMemo(
    () => [...new Set(players.map((p) => p.position))],
    [players]
  );
  const leagues = useMemo(
    () => [...new Set(players.map((p) => p.league))],
    [players]
  );
  const nations = useMemo(
    () => [...new Set(players.map((p) => p.nationality))],
    [players]
  );
  const feet = ["links", "rechts", "beidfüßig"];

  const filteredPlayers = useMemo(() => {
    let list = players.filter((p) => {
      if (maxAge !== "" && p.age > maxAge) return false;

      if (search) {
        const s = search.toLowerCase();
        const hay = `${p.name} ${p.club} ${p.league} ${p.position} ${p.nationality}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }

      if (positionFilter && p.position !== positionFilter) return false;
      if (leagueFilter && p.league !== leagueFilter) return false;
      if (nationFilter && p.nationality !== nationFilter) return false;
      if (footFilter && p.foot !== footFilter) return false;

      return true;
    });

    switch (sortBy) {
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "age-asc":
        list.sort((a, b) => a.age - b.age);
        break;
      case "age-desc":
        list.sort((a, b) => b.age - a.age);
        break;
      case "pot-desc":
        list.sort((a, b) => b.potentialRating - a.potentialRating);
        break;
      case "pot-asc":
        list.sort((a, b) => a.potentialRating - b.potentialRating);
        break;
      case "pos-asc":
        list.sort((a, b) => a.position.localeCompare(b.position));
        break;
    }

    return list;
  }, [
    players,
    search,
    maxAge,
    positionFilter,
    leagueFilter,
    nationFilter,
    footFilter,
    sortBy,
  ]);

  if (authLoading || !user) {
    return (
      <main className="p-6 text-sm text-slate-400">
        Prüfe Login ...
      </main>
    );
  }

  return (
    <main className="space-y-6 p-4 md:p-6">

      {/* FILTER PANEL */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold mb-3">Filter</h2>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-7 text-sm">
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs text-slate-400">Suche</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, Verein, Liga ..."
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Max. Alter</label>
            <input
              type="number"
              min={15}
              max={30}
              value={maxAge === "" ? "" : maxAge}
              onChange={(e) =>
                setMaxAge(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Position</label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="">Alle</option>
              {positions.map((pos) => (
                <option key={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Liga</label>
            <select
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="">Alle</option>
              {leagues.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Nation</label>
            <select
              value={nationFilter}
              onChange={(e) => setNationFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="">Alle</option>
              {nations.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Fuß</label>
            <select
              value={footFilter}
              onChange={(e) => setFootFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="">Alle</option>
              {feet.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Sortieren nach</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
            >
              <option value="">Standard</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="age-asc">Alter (jung → alt)</option>
              <option value="age-desc">Alter (alt → jung)</option>
              <option value="pot-desc">Potenzial (hoch → niedrig)</option>
              <option value="pot-asc">Potenzial (niedrig → hoch)</option>
              <option value="pos-asc">Position (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-400">
          {loading
            ? "Lade Spieler..."
            : `${filteredPlayers.length} von ${players.length} Spielern`}
        </div>
      </section>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <section className="grid gap-3 md:grid-cols-2">
        {filteredPlayers.slice(0, visibleCount).map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </section>

      {visibleCount < filteredPlayers.length && (
        <div className="text-center text-slate-400 py-6">
          Lädt weitere Spieler...
        </div>
      )}
    </main>
  );
}