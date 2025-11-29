"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
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
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Rolle laden
      const ref = doc(db, "userRoles", cred.user.uid);
      const snap = await getDoc(ref);
      const role = snap.exists() ? (snap.data().role as string) : "none";

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "reader") {
        router.push("/");
      } else {
        setError("Keine gültige Rolle zugewiesen (admin/reader).");
      }
    } catch (err: any) {
      console.error(err);
      setError("Login fehlgeschlagen. Bitte Zugangsdaten prüfen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3 text-sm"
      >
        <h1 className="text-xl font-semibold mb-2 text-center">Scout 360 Login</h1>

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