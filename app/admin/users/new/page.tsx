"use client";

import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function NewUserPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("reader");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Nutzer in Firebase Auth anlegen
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // Rolle in Firestore speichern
      await setDoc(doc(db, "userRoles", cred.user.uid), {
        role,
        email,
      });

      router.push("/admin/users");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Fehler beim Anlegen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Neuen Benutzer einladen</h1>

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">E-Mail</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Passwort</label>
          <input
            required
            type="password"
            value={password}
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Rolle</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
          >
            <option value="admin">admin</option>
            <option value="reader">reader</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? "Erstelle Benutzer..." : "Benutzer anlegen"}
        </button>
      </form>
    </main>
  );
}