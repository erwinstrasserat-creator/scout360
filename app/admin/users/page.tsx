"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

type UserItem = {
  id: string;
  email: string;
  role: string | null;
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ⛔ WICHTIG: verhindert Firebase-Zugriff während next build / SSR
    if (typeof window === "undefined") return;

    const loadUsers = async () => {
      try {
          // Users laden
        const userSnap = await getDocs(collection(db, "users"));

        const promises = userSnap.docs.map(async (d) => {
          const uid = d.id;
          const userData = d.data();

          // Rolle separat holen
          try {
            const roleSnap = await getDoc(doc(db, "userRoles", uid));
            const role = roleSnap.exists() ? roleSnap.data().role : "none";

            return {
              id: uid,
              email: userData.email ?? "unbekannt",
              role,
            } as UserItem;
          } catch (err) {
            console.error("Fehler beim Laden der Rolle:", err);
            return {
              id: uid,
              email: userData.email ?? "unbekannt",
              role: "none",
            } as UserItem;
          }
        });

        const fullList = await Promise.all(promises);
        setUsers(fullList);
      } catch (err) {
        console.error("Fehler beim Laden der Benutzer:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  if (loading) {
    return <div className="p-4 text-slate-400">Lade Benutzer…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Benutzerverwaltung</h1>

        <Link
          href="/admin/users/new"
          className="rounded-lg bg-emerald-500 text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-emerald-400"
        >
          + Neuer Benutzer
        </Link>
      </div>

      <div className="grid gap-3">
        {users.map((u) => (
          <Link
            href={`/admin/users/${u.id}`}
            key={u.id}
            className="border border-slate-700 bg-slate-900/60 rounded-xl p-4 hover:border-emerald-400 transition flex justify-between"
          >
            <div>
              <div className="font-bold text-lg">{u.email}</div>
              <div className="text-sm text-slate-400">
                Rolle: {u.role ?? "keine"}
              </div>
            </div>

            <div className="text-sm text-emerald-300">Bearbeiten →</div>
          </Link>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-slate-500 text-sm">Keine Benutzer gefunden.</div>
      )}
    </div>
  );
}