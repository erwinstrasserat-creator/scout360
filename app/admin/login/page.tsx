"use client";

import { Suspense, FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Nur Firebase Login – NICHTS anderes
      await signInWithEmailAndPassword(auth, email, password);

      // WICHTIG:
      // AuthContext übernimmt:
      //  - Role laden
      //  - Cookies setzen
      //  - Weiterleitung nach /admin

    } catch (err) {
      console.error(err);
      setError("Login fehlgeschlagen – bitte prüfen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-sm mx-auto mt-20 p-6 bg-slate-900 border border-slate-700 rounded-xl">
      <h1 className="text-xl font-semibold mb-4">Login</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400">E-Mail</label>
          <input
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">Passwort</label>
          <input
            type="password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          disabled={loading}
          className="w-full bg-emerald-500 text-slate-900 font-semibold py-2 rounded hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Anmelden…" : "Login"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">Lade Login…</div>}>
      <LoginForm />
    </Suspense>
  );
}