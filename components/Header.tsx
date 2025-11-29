"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const { user, role, logout } = useAuth();

  return (
    <header className="w-full border-b border-slate-800 bg-slate-900/70 backdrop-blur-md">
      <div className="max-w-5xl mx-auto flex items-center justify-between p-4">

        {/* Logo + Titel */}
        <Link href="/" className="flex items-center gap-3 group">
          <Image
            src="/logo.png"    // <-- dein Logo im public/ Ordner
            alt="Scout 360 Logo"
            width={60}
            height={60}
            className="rounded-md group-hover:opacity-80 transition"
            priority
          />
          <span className="text-lg font-semibold text-emerald-400 group-hover:text-emerald-300 transition">
            Scout 360
          </span>
        </Link>

        {/* Rechte Seite */}
        <div className="flex items-center gap-4 text-sm">

          {user && (
            <>
              {/* Rolle anzeigen */}
              <span className="text-slate-400">
                {role === "admin" ? "Admin" : "Reader"}
              </span>

              {/* Admin Button */}
              {role === "admin" && (
                <Link
                  href="/admin"
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-slate-900 font-semibold hover:bg-emerald-500"
                >
                  Admin
                </Link>
              )}

              {/* Logout */}
              <button
                onClick={logout}
                className="rounded-lg bg-red-500 px-3 py-1 text-slate-900 font-semibold hover:bg-red-400"
              >
                Logout
              </button>
            </>
          )}

          {!user && (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-3 py-1 text-slate-900 font-semibold hover:bg-emerald-400"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}