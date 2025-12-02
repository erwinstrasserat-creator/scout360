"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function NewUserPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("reader");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const createUser = async () => {
    setError(null);

    if (!email || !password) {
      setError("E-Mail und Passwort dürfen nicht leer sein.");
      return;
    }

    try {
      setSaving(true);

      // 1️⃣ Neuen User in Firebase Authentication erstellen
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // 2️⃣ User-Daten in Firestore speichern
      await setDoc(doc(db, "users", uid), {
        email,
        createdAt: Date.now(),
      });

      // 3️⃣ Rolle in Firestore speichern
      await setDoc(doc(db, "userRoles", uid), {
        role,
      });

      alert("Benutzer erfolgreich erstellt.");
      router.push("/admin/users");

    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Fehler beim Erstellen des Benutzers.");
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