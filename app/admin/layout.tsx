"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/login"; // redirect
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">

      {/* -------------------------------------- */}
      {/* 🔝 HEADER: LOGO CENTER + LOGOUT RIGHT */}
      {/* -------------------------------------- */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/70">

        {/* LEFT: Dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-sm"
          >
            ☰ Menü
          </button>

          {open && (
            <div className="absolute mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-2 space-y-1 z-50">
              <Link
                href="/admin"
                className="block px-3 py-2 rounded hover:bg-slate-800 text-sm"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/players"
                className="block px-3 py-2 rounded hover:bg-slate-800 text-sm"
              >
                Spieler
              </Link>
              <Link
                href="/admin/needs"
                className="block px-3 py-2 rounded hover:bg-slate-800 text-sm"
              >
                Bedarfslisten
              </Link>
              <Link
                href="/admin/clubs"
                className="block px-3 py-2 rounded hover:bg-slate-800 text-sm"
              >
                Vereine
              </Link>
              <Link
                href="/admin/reports"
                className="block px-3 py-2 rounded hover:bg-slate-800 text-sm"
              >
                Reports
              </Link>
              <Link
                href="/admin/users"
                className="block px-3 py-2 rounded hover:bg-slate-800 text-sm"
              >
                Benutzerverwaltung
              </Link>
            </div>
          )}
        </div>

        {/* CENTER: Logo */}
        <div className="flex-1 flex justify-center">
          <Image
            src="/logo.png"
            alt="Scout360 Logo"
            width={120}
            height={40}
            className="opacity-90"
          />
        </div>

        {/* RIGHT: Logout */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold"
        >
          Logout
        </button>
      </header>

      {/* CONTENT */}
      <main className="p-6">{children}</main>
    </div>
  );
}