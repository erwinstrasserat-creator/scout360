"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function NewUserPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("reader");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createUser = async () => {
    if (saving) return; // Schutz gegen Doppel-Klick
    setError(null);

    if (!email || !password) {
      setError("E-Mail und Passwort dürfen nicht leer sein.");
      return;
    }

    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    try {
      setSaving(true);

      // ⛔ Nur im Browser – aber Component ist 'use client', daher sicher
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Firestore: User + Rolle speichern (parallel)
      await Promise.all([
        setDoc(doc(db, "users", uid), {
          email,
          createdAt: Date.now(),
        }),

        setDoc(doc(db, "userRoles", uid), {
          role,
        }),
      ]);

      alert("Benutzer erfolgreich erstellt.");
      router.push("/admin/users");

    } catch (err: any) {
      console.error("Firebase Error:", err);

      let msg = "Fehler beim Erstellen des Benutzers.";

      switch (err?.code) {
        case "auth/email-already-in-use":
          msg = "Diese E-Mail wird bereits verwendet.";
          break;
        case "auth/invalid-email":
          msg = "Die E-Mail-Adresse ist ungültig.";
          break;
        case "auth/weak-password":
          msg = "Passwort ist zu schwach.";
          break;
        default:
          msg = err?.message || msg;
      }

      setError(msg);

    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Neuen Benutzer anlegen</h1>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">

        <div>
          <label className="text-sm text-slate-300">E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 focus:border-emerald-400 outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">Passwort</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 focus:border-emerald-400 outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">Rolle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="block w-full mt-1 rounded-lg bg-slate-950 border border-slate-700 px-2 py-2 focus:border-emerald-400 outline-none"
          >
            <option value="reader">Reader</option>
            <option value="admin">Admin</option>
            <option value="none">Keine Rolle</option>
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={createUser}
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-slate-900 font-semibold hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Erstelle Benutzer…" : "Benutzer erstellen"}
        </button>

      </div>
    </div>
  );
}