"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import type { ClubNeed, NeedAssignment, Player, PlayerStats } from "../../../../lib/types";
import Link from "next/link";

interface MatchPlayer extends Player {
  matchScore: number;
}

export default function NeedDetailPage() {
  const params = useParams() as { id: string };
  const needId = params.id;

  const [need, setNeed] = useState<ClubNeed | null>(null);
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [assignments, setAssignments] = useState<NeedAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Bedarf laden
      const needSnap = await getDoc(doc(db, "clubNeeds", needId));
      if (!needSnap.exists()) {
        setNeed(null);
        setLoading(false);
        return;
      }
      const needData = { id: needSnap.id, ...(needSnap.data() as any) } as ClubNeed;
      setNeed(needData);

      // Spieler laden
      const playerSnap = await getDocs(collection(db, "players"));
      const playersRaw: Player[] = playerSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Zuordnungen laden
      const assignSnap = await getDocs(
        query(collection(db, "needAssignments"), where("needId", "==", needId))
      );
      const assignList: NeedAssignment[] = assignSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setAssignments(assignList);

      // MatchScore berechnen
      const enriched: MatchPlayer[] = playersRaw.map((p) => ({
        ...p,
        matchScore: calcMatchScore(p, needData),
      }));

      // nach Score sortieren
      enriched.sort((a, b) => b.matchScore - a.matchScore);
      setPlayers(enriched);
      setLoading(false);
    };

    load();
  }, [needId]);

  const assignedPlayerIds = useMemo(
    () => new Set(assignments.map((a) => a.playerId)),
    [assignments]
  );

  if (loading) {
    return (
      <main className="p-6 text-sm text-slate-400">
        Bedarfsliste & Spieler werden geladen...
      </main>
    );
  }

  if (!need) {
    return (
      <main className="p-6 text-sm text-red-400">
        Bedarfsliste nicht gefunden.
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {need.clubName} – {need.position}
        </h1>
        <Link
          href="/admin/needs"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Zurück zur Übersicht
        </Link>
      </div>

      {/* Bedarf Infos */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm">
        <p className="text-slate-300">
          Alter: {need.minAge || "?"}–{need.maxAge || "?"} • Min. Größe:{" "}
          {need.heightMin || "?"} cm • Toleranz: {need.tolerance}%
        </p>
        <p className="text-slate-300 mt-1">
          Bevorzugter Fuß: {need.preferredFoot || "egal"}
        </p>
        <p className="text-slate-300 mt-1">
          Gesuchte Merkmale:{" "}
          {need.requiredTraits.length
            ? need.requiredTraits.join(", ")
            : "keine expliziten Merkmale"}
        </p>
        {need.notes && (
          <p className="text-slate-400 mt-2">Notizen: {need.notes}</p>
        )}
      </section>

      {/* Spieler-Matching */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-2">Spieler-Matches</h2>

        <p className="text-xs text-slate-400 mb-2">
          Spieler sind nach Match-Score sortiert. Grün = alle Bedingungen weitgehend erfüllt.
        </p>

        <div className="space-y-3">
          {players.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <p className="font-semibold text-slate-100">
                  {p.name} ({p.age}) – {p.position}
                </p>
                <p className="text-xs text-slate-400">
                  {p.club} • {p.league} • {p.nationality}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Technik {p.stats.technik}, Tempo {p.stats.tempo}, Physis{" "}
                  {p.stats.physis}, Intelligenz {p.stats.intelligenz}, Defensiv{" "}
                  {p.stats.defensiv}, Offensiv {p.stats.offensiv}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <p
                    className={`text-lg font-semibold ${
                      p.matchScore >= 80
                        ? "text-emerald-400"
                        : p.matchScore >= 60
                        ? "text-yellow-400"
                        : "text-slate-300"
                    }`}
                  >
                    {Math.round(p.matchScore)}%
                  </p>
                  <p className="text-xs text-slate-500">Match Score</p>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/players/${p.id}`}
                    className="text-xs px-3 py-1 rounded-lg border border-slate-700 text-slate-200 hover:border-emerald-400"
                  >
                    Profil
                  </Link>

                  <Link
                    href={`/admin/assign-player/${p.id}?needId=${needId}`}
                    className="text-xs px-3 py-1 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400"
                  >
                    Zuordnen
                  </Link>
                </div>

                {assignedPlayerIds.has(p.id) && (
                  <p className="text-[10px] text-emerald-400">
                    Bereits zugeordnet
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// Matching-Logik
function calcMatchScore(player: Player, need: ClubNeed): number {
  let score = 0;
  let maxScore = 100;

  // Gewichtung
  const posWeight = 25;
  const ageWeight = 20;
  const statsWeight = 35;
  const traitWeight = 10;
  const heightWeight = 10;

  const tol = need.tolerance ?? 0;

  // Position
  if (player.position && need.position) {
    if (player.position.toLowerCase() === need.position.toLowerCase()) {
      score += posWeight;
    } else if (
      player.position.toLowerCase().includes(need.position.toLowerCase()) ||
      need.position.toLowerCase().includes(player.position.toLowerCase())
    ) {
      score += posWeight * 0.7;
    }
  }

  // Alter
  if (need.minAge || need.maxAge) {
    let ageSub = 0;
    if (need.minAge && player.age >= need.minAge) ageSub += 0.5;
    if (need.maxAge && player.age <= need.maxAge) ageSub += 0.5;
    score += ageWeight * ageSub;
  }

  // Größe → korrigiert: heightMin statt minHeight
  if (need.heightMin && player.heightCm) {
    if (player.heightCm >= need.heightMin) {
      score += heightWeight;
    } else if (player.heightCm >= need.heightMin - 3) {
      score += heightWeight * 0.5;
    }
  }

  // Traits (Stärken)
  if (need.requiredTraits && need.requiredTraits.length > 0) {
    const playerTraits = (player.strengths || []).map((s) =>
      s.toLowerCase()
    );
    let hits = 0;
    for (const t of need.requiredTraits) {
      const lower = t.toLowerCase();
      if (playerTraits.some((pt) => pt.includes(lower))) hits++;
    }
    const ratio = hits / need.requiredTraits.length;
    score += traitWeight * Math.min(1, ratio);
  }

  // Stats
  if (need.minStats) {
    let fulfilled = 0;
    let total = 0;
    for (const key of Object.keys(need.minStats) as (keyof PlayerStats)[]) {
      const required = need.minStats[key];
      if (required == null) continue;
      total++;

      const value = player.stats[key];
      const minAccepted = required - tol;
      if (value >= required) {
        fulfilled += 1;
      } else if (value >= minAccepted) {
        fulfilled += 0.5;
      }
    }
    if (total > 0) {
      score += statsWeight * (fulfilled / total);
    }
  }

  // Fuß (leicht gewichtet)
  if (need.preferredFoot) {
    if (player.foot === need.preferredFoot) {
      score += 5;
      maxScore += 5;
    }
  }

  return Math.min(100, (score / maxScore) * 100);
}