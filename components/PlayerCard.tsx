"use client";

import Link from "next/link";
import type { Player } from "../lib/types";
import { useAuth } from "../context/AuthContext";

export function PlayerCard({ player }: { player: Player }) {
  const { role } = useAuth() as any;
  const isAdmin = role === "admin";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex gap-4 hover:border-emerald-500/50 transition">
      
      {/* Bild */}
      <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-800 shrink-0">
        {player.imageUrl ? (
          <img
            src={player.imageUrl}
            alt={player.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center text-xs text-slate-500 h-full">
            Kein Bild
          </div>
        )}
      </div>

      {/* Inhalt */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <h2 className="text-lg font-semibold truncate">{player.name}</h2>

        <p className="text-slate-400 text-sm truncate">
          {player.age} Jahre • {player.position} • {player.club}
        </p>
        <p className="text-slate-500 text-xs">
          {player.nationality} • {player.league}
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">

          {/* Profil öffnen */}
          <Link
            href={`/players/${player.id}`}
            className="rounded-lg bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700 transition"
          >
            Profil
          </Link>

          {/* Videos */}
          <Link
            href={`/players/${player.id}/videos`}
            className="rounded-lg bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700 transition"
          >
            Videos
          </Link>

          {/* Admin Buttons */}
          {isAdmin && (
            <>
              {/* Bedarfsliste */}
              <Link
                href={`/admin/assign-player/${player.id}`}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-emerald-500 transition"
              >
                Bedarfsliste
              </Link>

              {/* Scouting Report */}
              <Link
                href={`/admin/reports/new?player=${player.id}`}
                className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-blue-500 transition"
              >
                Report
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}