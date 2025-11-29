"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import type { VideoFavorite } from "../../lib/types";
import Link from "next/link";

export default function FavoritesPage() {
  const { user } = useAuth() as any;
  const [favorites, setFavorites] = useState<VideoFavorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      const q = query(
        collection(db, "videoFavorites"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q);
      const list: VideoFavorite[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setFavorites(list);
      setLoading(false);
    };

    load();
  }, [user]);

  if (!user) {
    return (
      <main className="p-6 text-sm text-slate-400">
        Bitte einloggen, um Favoriten zu sehen.
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Meine Video-Favoriten</h1>

      {loading && <p className="text-sm text-slate-400">Lade Favoriten...</p>}

      {!loading && favorites.length === 0 && (
        <p className="text-sm text-slate-500">Keine Favoriten vorhanden.</p>
      )}

      <div className="space-y-4">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm"
          >
            <p className="text-slate-300 font-semibold mb-1">
              {fav.videoTitle}
            </p>
            <p className="text-xs text-slate-400 mb-2">
              Spieler-ID: {fav.playerId}
            </p>

            <div className="flex gap-3 items-center">
              <a
                href={fav.videoUrl}
                target="_blank"
                className="text-emerald-400 hover:text-emerald-300 text-xs"
              >
                → Video öffnen
              </a>
              <Link
                href={`/players/${fav.playerId}/videos`}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                → Spieler-Videoseite
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}