"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, loading } = useAuth() as any;
  const router = useRouter();

  // Admin Guard
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "admin") {
        router.push("/");
      }
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "admin") {
    return (
      <main className="p-6 text-sm text-slate-400">
        Admin-Bereich wird geladen...
      </main>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Navigation */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Bereich</h1>

        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:text-emerald-400 transition">
            Dashboard
          </Link>
          <Link href="/admin/seed" className="hover:text-emerald-400 transition">
            Seed (Spieler laden)
          </Link>
          <Link href="/admin/clubs" className="hover:text-emerald-400 transition">
            Vereine
          </Link>
          <Link href="/admin/needs" className="hover:text-emerald-400 transition">
            Bedarfslisten
          </Link>
          <Link href="/admin/users" className="hover:text-emerald-400 transition">
            Benutzerverwaltung
          </Link>
        </nav>
      </div>

      {/* Inhalt */}
      <div>{children}</div>
    </div>
  );
}