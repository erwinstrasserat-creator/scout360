"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <main className="space-y-6">
      <h2 className="text-lg font-semibold">Admin Übersicht</h2>

      <div className="grid md:grid-cols-2 gap-6">

        <Link
          href="/admin/seed"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-emerald-400 transition"
        >
          <h3 className="text-xl font-semibold mb-2">Spieler Seed</h3>
          <p className="text-slate-400 text-sm">
            Lade neue Spieler, aktualisiere Daten oder importiere grosse Mengen.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 hover:border-emerald-400 transition"
        >
          <h3 className="text-xl font-semibold mb-2">Benutzerverwaltung</h3>
          <p className="text-slate-400 text-sm">
            Verwalte Admins, Reader, Rollen und Zugänge.
          </p>
        </Link>

      </div>
    </main>
  );
}