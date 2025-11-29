"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { auth } from "../../../lib/firebase";

interface UserRole {
  id: string;       // UID
  role: string;     // "admin" | "reader"
  email?: string;   // Optional fallback
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setError(null);
      setLoading(true);

      const snap = await getDocs(collection(db, "userRoles"));
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      })) as UserRole[];

      setUsers(docs);
    } catch (e) {
      console.error(e);
      setError("Fehler beim Laden der Benutzer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateRole = async (uid: string, newRole: string) => {
    setSavingId(uid);
    try {
      await updateDoc(doc(db, "userRoles", uid), {
        role: newRole
      });
      setUsers(prev =>
        prev.map(u => (u.id === uid ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      console.error(error);
      setError("Fehler beim Speichern der Rolle.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteUserRole = async (uid: string) => {
    if (!confirm("Benutzer wirklich entfernen? (Nur Firestore-Zuordnung, nicht Firebase Auth)")) return;

    try {
      await deleteDoc(doc(db, "userRoles", uid));
      setUsers(prev => prev.filter(u => u.id !== uid));
    } catch (error) {
      console.error(error);
      setError("Fehler beim Entfernen.");
    }
  };

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Benutzerverwaltung</h1>

        <Link
          href="/admin/users/new"
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          + Neuen Benutzer einladen
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-400">Lade Benutzer...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-3 py-2 text-left">UID</th>
              <th className="px-3 py-2 text-left">E-Mail (optional)</th>
              <th className="px-3 py-2 text-left">Rolle</th>
              <th className="px-3 py-2 text-right">Aktionen</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/60">
                <td className="px-3 py-2 font-mono text-xs">{u.id}</td>
                <td className="px-3 py-2">{u.email ?? "—"}</td>

                <td className="px-3 py-2">
                  <select
                    value={u.role}
                    disabled={savingId === u.id}
                    onChange={(e) => updateRole(u.id, e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  >
                    <option value="admin">admin</option>
                    <option value="reader">reader</option>
                  </select>
                </td>

                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => deleteUserRole(u.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Entfernen
                  </button>
                </td>
              </tr>
            ))}

            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-xs">
                  Keine Nutzer vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}