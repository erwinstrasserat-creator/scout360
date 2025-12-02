"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (role !== "admin") {
      router.push("/");
      return;
    }
  }, [user, role, loading, router]);

  if (loading || !user || role !== "admin") {
    return (
      <main className="p-6 text-sm text-slate-400">
        Admin-Bereich wird geladen…
      </main>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <nav className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Bereich</h1>

        <div className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:text-emerald-400 transition">
            Dashboard
          </Link>

          <Link href="/admin/players" className="hover:text-emerald-400 transition">
            Spieler
          </Link>

          {/* Zuordnung entfernt — Route existierte nicht */}
          
          <Link href="/admin/needs" className="hover:text-emerald-400 transition">
            Bedarfslisten
          </Link>

          <Link href="/admin/clubs" className="hover:text-emerald-400 transition">
            Vereine
          </Link>

          <Link href="/admin/reports" className="hover:text-emerald-400 transition">
            Reports
          </Link>

          <Link href="/admin/users" className="hover:text-emerald-400 transition">
            Benutzerverwaltung
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}