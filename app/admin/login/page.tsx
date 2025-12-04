"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("from") || "/admin";

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    // ⛔ Sicherheit: im Build niemals ausführen
    if (typeof window === "undefined") return;

    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Login via Firebase Auth
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // 2️⃣ Rolle aus Firestore laden
      const roleSnap = await getDoc(doc(db, "userRoles", uid));
      const role = roleSnap.exists() ? roleSnap.data().role : "none";

      // 3️⃣ Cookies setzen (für Middleware)
      document.cookie = `auth=true; Path=/; Max-Age=86400; SameSite=None; Secure`;
      document.cookie = `role=${role}; Path=/; Max-Age=86400; SameSite=None; Secure`;

      router.push(redirectTo);
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