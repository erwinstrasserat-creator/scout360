"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import type { Player, PlayerVideo } from "@/lib/types";

type ApiLiveStats = {
  player: {
    apiId: number;
    name: string;
    nationality: string | null;
    photo: string | null;
  };
  stats: {
    club: string | null;
    league: string | null;
    country: string | null;
    season: number | null;
    position: string | null;
    appearances: number | null;
    minutes: number | null;
    goals: number | null;
    assists: number | null;
    rating: number | null;
    passAccuracy: number | null;
  };
};

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;

  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  const [liveStats, setLiveStats] = useState<ApiLiveStats | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  // Spieler aus Firestore laden
  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }
    if (!playerId) return;

    const loadPlayer = async () => {
      try {
        const ref = doc(db, "players", playerId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setPlayer({ id: snap.id, ...(snap.data() as any) });
        } else {
          setPlayer(null);
        }
      } catch (err) {
        console.error("Fehler beim Laden des Spielers:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPlayer();
  }, [playerId]);

  // Videos zu diesem Spieler laden
  useEffect(() => {
    if (typeof window === "undefined") {
      setVideosLoading(false);
      return;
    }
    if (!playerId) return;

    const loadVideos = async () => {
      try {
        const q = query(
          collection(db, "videos"),
          where("playerId", "==", playerId),
          orderBy("createdAt", "desc")
        );

        const snap = await getDocs(q);
        const list: PlayerVideo[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        setVideos(list);
      } catch (err) {
        console.error("Fehler beim Laden der Videos:", err);
      } finally {
        setVideosLoading(false);
      }
    };

    loadVideos();
  }, [playerId]);

  // Live-Stats von API-Football holen (nur wenn apiId im Player vorhanden)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!player || !(player as any).apiId) return;

    const apiId = (player as any).apiId as number;

    const loadLiveStats = async () => {
      setLiveLoading(true);
      setLiveError(null);
      try {
        const res = await fetch(
          `/api/playerStats?id=${apiId}&season=2025`
        );
        if (!res.ok) {
          const txt = await res.text();
          console.error("API playerStats Fehler:", txt);
          setLiveError("Keine Live-Stats verfügbar.");
          return;
        }
        const data: ApiLiveStats = await res.json();
        setLiveStats(data);
      } catch (err) {
        console.error("Fehler beim Laden der Live-Stats:", err);
        setLiveError("Fehler beim Laden der Live-Stats.");
      } finally {
        setLiveLoading(false);
      }
    };

    loadLiveStats();
  }, [player]);

  const deletePlayer = async () => {
    if (!playerId) return;
    if (!confirm("Diesen Spieler wirklich löschen?")) return;

    try {
      await deleteDoc(doc(db, "players", playerId));
      router.push("/admin/players");
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-slate-300">
        Spieler wird geladen…
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-6 text-slate-400">
        Spieler nicht gefunden.
      </div>
    );
  }

  const scoutingStats = player.stats ?? {
    technik: 0,
    tempo: 0,
    physis: 0,
    intelligenz: 0,
    defensiv: 0,
    offensiv: 0,
  };

  const strengths = player.strengths ?? [];
  const weaknesses = player.weaknesses ?? [];

  const displayClub =
    liveStats?.stats.club ?? player.club ?? "-";
  const displayLeague =
    liveStats?.stats.league ?? player.league ?? "-";

  const photoUrl =
    liveStats?.player.photo ?? player.imageUrl ?? null;

  return (
    <div className="space-y-6 p-6">
      {/* Kopfbereich */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {photoUrl && (
          <div className="w-32 h-32 rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={player.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{player.name}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span>
              <span className="text-slate-400">Alter:</span>{" "}
              {player.age ?? "-"}
            </span>
            <span>
              <span className="text-slate-400">Größe:</span>{" "}
              {player.heightCm ? `${player.heightCm} cm` : "-"}
            </span>
            <span>
              <span className="text-slate-400">Position:</span>{" "}
              {player.position ?? "-"}
            </span>
            <span>
              <span className="text-slate-400">Fuß:</span>{" "}
              {player.foot ?? "-"}
            </span>
            {player.nationality && (
              <span>
                <span className="text-slate-400">Nation:</span>{" "}
                {player.nationality}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span>
              <span className="text-slate-400">Verein:</span>{" "}
              {displayClub}
            </span>
            <span>
              <span className="text-slate-400">Liga:</span>{" "}
              {displayLeague}
            </span>
          </div>

          {(player as any).onLoan && (
            <div className="text-sm text-amber-400">
              Auf Leihbasis von{" "}
              {(player as any).loanFrom ?? "unbekannt"}
            </div>
          )}
        </div>
      </div>

      {/* Karten */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scouting / interne Bewertung */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <h2 className="text-lg font-semibold">
              Scouting-Stats (intern)
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <StatBox label="Technik" value={scoutingStats.technik} />
              <StatBox label="Tempo" value={scoutingStats.tempo} />
              <StatBox label="Physis" value={scoutingStats.physis} />
              <StatBox label="Intelligenz" value={scoutingStats.intelligenz} />
              <StatBox label="Defensiv" value={scoutingStats.defensiv} />
              <StatBox label="Offensiv" value={scoutingStats.offensiv} />
            </div>

            {(player.overallRating || player.potentialRating) && (
              <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                {player.overallRating !== undefined && (
                  <StatBox
                    label="Gesamtbewertung"
                    value={player.overallRating}
                  />
                )}
                {player.potentialRating !== undefined && (
                  <StatBox
                    label="Potential"
                    value={player.potentialRating}
                  />
                )}
              </div>
            )}
          </div>

          {/* Stärken / Schwächen */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              {strengths.length > 0 && (
                <div className="rounded-xl border border-emerald-800/60 bg-emerald-900/10 p-4">
                  <h3 className="text-sm font-semibold text-emerald-300 mb-2">
                    Stärken
                  </h3>
                  <ul className="text-sm text-emerald-100 list-disc list-inside space-y-1">
                    {strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div className="rounded-xl border border-red-800/60 bg-red-900/10 p-4">
                  <h3 className="text-sm font-semibold text-red-300 mb-2">
                    Schwächen
                  </h3>
                  <ul className="text-sm text-red-100 list-disc list-inside space-y-1">
                    {weaknesses.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Markt / Management */}
          {(player.marketValue ||
            player.agency ||
            player.marketValueSource) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2 text-sm text-slate-200">
              <h2 className="text-lg font-semibold mb-1">
                Markt & Management
              </h2>
              {player.marketValue !== undefined && (
                <div>
                  <span className="text-slate-400">Marktwert:</span>{" "}
                  {player.marketValue
                    ? `${player.marketValue.toLocaleString("de-DE")} €`
                    : "–"}
                </div>
              )}
              {player.marketValueSource && (
                <div>
                  <span className="text-slate-400">Quelle:</span>{" "}
                  {player.marketValueUrl ? (
                    <a
                      href={player.marketValueUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-emerald-400"
                    >
                      {player.marketValueSource}
                    </a>
                  ) : (
                    player.marketValueSource
                  )}
                </div>
              )}
              {player.agency && (
                <div>
                  <span className="text-slate-400">Agentur:</span>{" "}
                  {player.agencyUrl ? (
                    <a
                      href={player.agencyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-emerald-400"
                    >
                      {player.agency}
                    </a>
                  ) : (
                    player.agency
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live-Stats & Aktionen */}
        <div className="space-y-4">
          {/* Live-Stats */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <h2 className="text-lg font-semibold">
              Live-Stats (API-Football)
            </h2>

            {liveLoading && (
              <p className="text-sm text-slate-400">
                Lade Live-Stats…
              </p>
            )}

            {liveError && (
              <p className="text-sm text-amber-400">{liveError}</p>
            )}

            {!liveLoading && !liveError && liveStats && (
              <div className="space-y-2 text-sm text-slate-200">
                <div>
                  <span className="text-slate-400">Saison:</span>{" "}
                  {liveStats.stats.season ?? "2025"}
                </div>
                <div>
                  <span className="text-slate-400">Einsätze:</span>{" "}
                  {liveStats.stats.appearances ?? "-"}
                </div>
                <div>
                  <span className="text-slate-400">Minuten:</span>{" "}
                  {liveStats.stats.minutes ?? "-"}
                </div>
                <div>
                  <span className="text-slate-400">Tore:</span>{" "}
                  {liveStats.stats.goals ?? "-"}
                </div>
                <div>
                  <span className="text-slate-400">Assists:</span>{" "}
                  {liveStats.stats.assists ?? "-"}
                </div>
                <div>
                  <span className="text-slate-400">Durchschnittsnote:</span>{" "}
                  {liveStats.stats.rating
                    ? liveStats.stats.rating.toFixed(2)
                    : "-"}
                </div>
                <div>
                  <span className="text-slate-400">Passquote:</span>{" "}
                  {liveStats.stats.passAccuracy
                    ? `${liveStats.stats.passAccuracy}%`
                    : "-"}
                </div>
              </div>
            )}

            {!liveLoading &&
              !liveStats &&
              !liveError &&
              !(player as any).apiId && (
                <p className="text-xs text-slate-500">
                  Kein API-Player-ID (apiId) im Spieler hinterlegt – Live-Stats
                  nicht verfügbar.
                </p>
              )}
          </div>

          {/* Aktionen */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Aktionen</h2>

            <div className="flex flex-col gap-2">
              <button
                onClick={() =>
                  router.push(`/admin/edit/${playerId}`)
                }
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white"
              >
                Spieler bearbeiten
              </button>

            <button
              onClick={() =>
                router.push(`/players/${playerId}/videos`)
              }
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
            >
              Alle Videos anzeigen
            </button>

              <button
                onClick={deletePlayer}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-red-400"
              >
                Spieler löschen
              </button>
            </div>
          </div>

          {/* Kurze Video-Liste */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Videos</h2>

            {videosLoading && (
              <p className="text-sm text-slate-400">Lade Videos…</p>
            )}

            {!videosLoading && videos.length === 0 && (
              <p className="text-sm text-slate-500">
                Keine Videos für diesen Spieler hinterlegt.
              </p>
            )}

            {!videosLoading && videos.length > 0 && (
              <ul className="space-y-2 text-sm">
                {videos.slice(0, 5).map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{v.title}</span>
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-400 underline hover:text-emerald-300"
                    >
                      öffnen
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Kleine Helper-Component für Stat-Werte */
function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-sm font-semibold text-slate-50">
        {value ?? 0}/100
      </div>
    </div>
  );
}