"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Titel */}
      <div>
        <h2 className="text-2xl font-bold mb-1">Admin Übersicht</h2>
        <p className="text-slate-400 text-sm">
          Verwaltungsbereich für Daten, Benutzer & Systemaktionen.
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* SEED */}
        <Link
          href="/admin/seed"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 
                     hover:border-emerald-400 transition block"
        >
          <h3 className="text-xl font-semibold mb-2">Spieler Seed</h3>
          <p className="text-slate-400 text-sm">
            Lade neue Spieler, aktualisiere Daten oder importiere große Mengen.
          </p>
        </Link>

        {/* USERS */}
        <Link
          href="/admin/users"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 
                     hover:border-emerald-400 transition block"
        >
          <h3 className="text-xl font-semibold mb-2">Benutzerverwaltung</h3>
          <p className="text-slate-400 text-sm">
            Verwalte Admins, Reader & Zugänge.
          </p>
        </Link>

      </div>
    </div>
  );
}