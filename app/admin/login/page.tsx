"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
    } catch (err: any) {
      console.error(err);
      setError("Login fehlgeschlagen. Bitte Zugangsdaten prüfen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-sm mx-auto mt-16 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">E-Mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Passwort</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading ? "Anmelden ..." : "Login"}
        </button>
      </form>
    </main>
  );
}