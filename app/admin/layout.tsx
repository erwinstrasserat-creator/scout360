"use client";

import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6 p-6">
      <nav className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Bereich</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/players">Spieler</Link>
          <Link href="/admin/needs">Bedarfslisten</Link>
          <Link href="/admin/clubs">Vereine</Link>
          <Link href="/admin/reports">Reports</Link>
          <Link href="/admin/users">Benutzerverwaltung</Link>
        </div>
      </nav>

      {children}
    </div>
  );
}