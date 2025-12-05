"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useAuth } from "../../../../context/AuthContext";
import type { PlayerVideo, VideoFavorite } from "../../../../lib/types";
import Link from "next/link";

export default function PlayerVideosPage() {
  const params = useParams();
  const playerId = params.id as string;
  const { user, role } = useAuth() as any;

  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [favorites, setFavorites] = useState<Record<string, string>>({}); // videoId -> favId

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState("YouTube");
  const [status, setStatus] = useState<string | null>(null);

  // Videos laden
  const loadVideos = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "playerVideos"),
        where("playerId", "==", playerId)
      );
      const snap = await getDocs(q);
      const list: PlayerVideo[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setVideos(list);
    } finally {
      setLoading(false);
    }
  };

  // Favoriten des Users für diesen Spieler laden
  const loadFavorites = async () => {
    if (!user) return;
    const q = query(
      collection(db, "videoFavorites"),
      where("userId", "==", user.uid),
      where("playerId", "==", playerId)
    );
    const snap = await getDocs(q);
    const map: Record<string, string> = {};
    snap.docs.forEach((d) => {
      const data = d.data() as VideoFavorite;
      map[data.videoId] = d.id;
    });
    setFavorites(map);
  };

  useEffect(() => {
    loadVideos();
  }, [playerId]);

  useEffect(() => {
    loadFavorites();
  }, [playerId, user]);

  const handleAddVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || !url) return;
    try {
      setStatus("Video wird gespeichert...");
      await addDoc(collection(db, "playerVideos"), {
        playerId,
        title,
        url,
        source,
        createdAt: Date.now(),
        addedByUid: user?.uid || null,
      });
      setTitle("");
      setUrl("");
      setStatus("Video hinzugefügt.");
      await loadVideos();
    } catch (err) {
      console.error(err);
      setStatus("Fehler beim Speichern.");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Video wirklich löschen?")) return;
    try {
      await deleteDoc(doc(db, "playerVideos", videoId));
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (e) {
      console.error(e);
      alert("Fehler beim Löschen.");
    }
  };

  const toggleFavorite = async (v: PlayerVideo) => {
    if (!user) return;

    const existingFavId = favorites[v.id];

    // existiert -> löschen
    if (existingFavId) {
      await deleteDoc(doc(db, "videoFavorites", existingFavId));
      const newFavs = { ...favorites };
      delete newFavs[v.id];
      setFavorites(newFavs);
      return;
    }

    // sonst -> neu anlegen
    const favDoc = await addDoc(collection(db, "videoFavorites"), {
      userId: user.uid,
      playerId: v.playerId,
      videoId: v.id,
      playerName: "(Spieler)", // optional, kannst du später erweitern
      videoTitle: v.title,
      videoUrl: v.url,
      createdAt: Date.now(),
    } as Partial<VideoFavorite>);

    setFavorites((prev) => ({ ...prev, [v.id]: favDoc.id }));
  };

  const youtubeSearchUrl = (playerName: string) =>
    `https://www.youtube.com/results?search_query=${encodeURIComponent(
      playerName + " highlights"
    )}`;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Videos zu diesem Spieler</h1>
        <Link href={`/players/${playerId}`} className="text-sm text-slate-400 hover:text-slate-200">
          ← Zurück zum Profil
        </Link>
      </div>

      {/* Hinweis: YouTube Suche */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
        <p className="text-slate-300">
          Du kannst externe Videos (z.B. YouTube, Wyscout Clips) suchen und die relevanten Links hier abspeichern.
        </p>
      </section>

      {/* Admin: Video hinzufügen */}
      {role === "admin" && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-lg font-semibold mb-2">Video hinzufügen</h2>
          <form onSubmit={handleAddVideo} className="grid md:grid-cols-3 gap-3 text-sm">
            <div className="flex flex-col">
              <label className="text-xs text-slate-400">Titel</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
                placeholder="z.B. Highlights vs. XYZ"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-400">Video URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-400">Quelle</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
                placeholder="YouTube / Wyscout / ..."
              />
            </div>

            <div className="md:col-span-3 flex gap-3 items-center mt-2">
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
              >
                Video speichern
              </button>
              {status && <span className="text-xs text-slate-400">{status}</span>}
            </div>
          </form>
        </section>
      )}

      {/* Video-Liste */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <h2 className="text-lg font-semibold mb-2">Gespeicherte Videos</h2>

        {loading && <p className="text-sm text-slate-400">Lade Videos...</p>}

        {!loading && videos.length === 0 && (
          <p className="text-sm text-slate-500">Noch keine Videos gespeichert.</p>
        )}

        <div className="space-y-4">
          {videos.map((v) => {
            const isFav = !!favorites[v.id];
            const isYoutube =
              v.url.includes("youtube.com") || v.url.includes("youtu.be");

            return (
              <div
                key={v.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">{v.title}</p>
                    <p className="text-xs text-slate-400">
                      Quelle: {v.source || "Unbekannt"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleFavorite(v)}
                      className={`text-xs px-3 py-1 rounded-lg border ${
                        isFav
                          ? "border-emerald-400 text-emerald-300"
                          : "border-slate-700 text-slate-300"
                      }`}
                    >
                      {isFav ? "★ Favorit" : "☆ Favorit"}
                    </button>

                    {role === "admin" && (
                      <button
                        onClick={() => handleDeleteVideo(v.id)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-500 text-red-400"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>

                {isYoutube ? (
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-800 mt-2">
                    <iframe
                      src={convertToEmbedUrl(v.url)}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    href={v.url}
                    target="_blank"
                    className="text-emerald-400 text-xs hover:text-emerald-300"
                  >
                    → Video öffnen
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function convertToEmbedUrl(url: string): string {
  try {
    if (url.includes("embed")) return url;
    if (url.includes("watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1].split(/[?&]/)[0];
      return `https://www.youtube.com/embed/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}