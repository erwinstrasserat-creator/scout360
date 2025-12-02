"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ LOGIN
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // 2️⃣ TOKEN HOLEN
      const token = await cred.user.getIdToken();

      // 3️⃣ COOKIE SETZEN
      await fetch("/api/setAuth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      // 4️⃣ ROLLE LADEN
      const snap = await getDoc(doc(db, "userRoles", cred.user.uid));
      const role = snap.exists() ? snap.data().role : "none";

      // 5️⃣ REDIRECT LOGIK
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "reader") {
        router.push("/");
      } else {
        setError("Keine gültige Rolle zugewiesen (admin/reader).");
      }
    } catch (err) {
      console.error("Login-Fehler:", err);
      setError("Login fehlgeschlagen. Bitte E-Mail / Passwort prüfen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3"
      >
        <h1 className="text-xl font-semibold mb-2 text-center">
          Scout 360 Login
        </h1>

        <div>
          <label className="text-xs text-slate-400">E-Mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="text-xs text-slate-400">Passwort</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Anmelden…" : "Login"}
        </button>
      </form>
    </main>
  );
}