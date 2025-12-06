"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";

import { db, storage } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

/* ────────────────────────────────────────────────
   TYPES
────────────────────────────────────────────────── */

type PlayerStats = {
  offensiv: number;
  defensiv: number;
  intelligenz: number;
  physis: number;
  technik: number;
  tempo: number;
};

type PlayerDoc = {
  apiId?: number;
  apiTeamId?: number | null;

  name?: string | null;
  age?: number | null;
  nationality?: string | null;

  club?: string | null;
  league?: string | null;

  position?: string | null;
  foot?: string | null;
  heightCm?: number | null;

  imageUrl?: string | null;

  onLoan?: boolean;
  loanFrom?: string | null;

  stats?: PlayerStats;

  strengths?: string[];
  weaknesses?: string[];
  potentialRating?: number | null;
  overallRating?: number | null;
  marketValue?: number | null;
  marketValueSource?: string | null;
  marketValueUrl?: string | null;
  agency?: string | null;
  agencyUrl?: string | null;

  traits?: string[];
};

type PlayerVideo = {
  id: string;
  playerId: string;
  title: string;
  url: string;
  source?: string;
  createdAt?: number;
};

type Fixture = {
  fixture: { id: number; date: string };
  league: { name: string };
  teams: { home: { name: string }; away: { name: string } };
};

/* ─────────────────────────────────────────────── */

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();

  const playerId = params?.id as string;

  const [player, setPlayer] = useState<PlayerDoc | null>(null);
  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoSource, setVideoSource] = useState("YouTube");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false);

  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  /* Bearbeitbare Felder */
  const [form, setForm] = useState({
    name: "",
    age: "",
    nationality: "",
    club: "",
    league: "",
    position: "",
    foot: "",
    heightCm: "",
    strengths: "",
    weaknesses: "",
    potentialRating: "",
    overallRating: "",
    marketValue: "",
    marketValueSource: "",
    marketValueUrl: "",
    agency: "",
    agencyUrl: "",
    traits: "",
  });

  /* ───────────────────────────────────────────────
     LOAD PLAYER + VIDEOS + FAVORITE STATUS
  ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!playerId) return;

    const load = async () => {
      try {
        const ref = doc(db, "players", playerId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setPlayer(null);
          setLoading(false);
          return;
        }

        const data = snap.data() as PlayerDoc;
        setPlayer(data);

        setForm({
          name: data.name ?? "",
          age: data.age != null ? String(data.age) : "",
          nationality: data.nationality ?? "",
          club: data.club ?? "",
          league: data.league ?? "",
          position: data.position ?? "",
          foot: data.foot ?? "",
          heightCm: data.heightCm != null ? String(data.heightCm) : "",
          strengths: (data.strengths ?? []).join(", "),
          weaknesses: (data.weaknesses ?? []).join(", "),
          potentialRating: data.potentialRating != null ? String(data.potentialRating) : "",
          overallRating: data.overallRating != null ? String(data.overallRating) : "",
          marketValue: data.marketValue != null ? String(data.marketValue) : "",
          marketValueSource: data.marketValueSource ?? "",
          marketValueUrl: data.marketValueUrl ?? "",
          agency: data.agency ?? "",
          agencyUrl: data.agencyUrl ?? "",
          traits: (data.traits ?? []).join(", "),
        });

        const videosRef = collection(db, "playerVideos");
        const qVideos = query(videosRef, where("playerId", "==", playerId));
        const vidsSnap = await getDocs(qVideos);

        setVideos(
          vidsSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
        );

        const favRef = collection(db, "favoritePlayers");
        const favQuery = query(favRef, where("playerId", "==", playerId));
        const favSnap = await getDocs(favQuery);
        setIsFavorite(!favSnap.empty);
      } catch (err) {
        console.error(err);
        setError("Fehler beim Laden.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [playerId]);

  /* ───────────────────────────────────────────────
     FIXTURES LADEN
  ───────────────────────────────────────────────── */

  const loadFixtures = async () => {
    if (!player?.apiTeamId) return;

    setIsLoadingFixtures(true);

    try {
      const res = await fetch(`/api/fixtures/upcoming?teamId=${player.apiTeamId}&limit=4`);

      if (!res.ok) {
        setStatus("⚠️ Fehler beim Laden der Fixtures.");
        return;
      }

      const data = await res.json();
      setFixtures(data);
    } catch {
      setStatus("⚠️ Fehler beim Laden der Fixtures.");
    } finally {
      setIsLoadingFixtures(false);
    }
  };

  useEffect(() => {
    if (player?.apiTeamId) loadFixtures();
  }, [player?.apiTeamId]);

  /* ───────────────────────────────────────────────
     FAVORIT
  ───────────────────────────────────────────────── */

  const toggleFavorite = async () => {
    const favRef = collection(db, "favoritePlayers");

    if (isFavorite) {
      const qFav = query(favRef, where("playerId", "==", playerId));
      const snap = await getDocs(qFav);
      for (const d of snap.docs) await deleteDoc(d.ref);

      setIsFavorite(false);
      setStatus("❌ Aus Favoriten entfernt");
      return;
    }

    await addDoc(favRef, {
      playerId,
      name: player?.name ?? "",
      club: player?.club ?? "",
      league: player?.league ?? "",
      imageUrl: player?.imageUrl ?? null,
      createdAt: Date.now(),
    });

    setIsFavorite(true);
    setStatus("⭐ Zu Favoriten hinzugefügt");
  };

  /* ───────────────────────────────────────────────
     FORM
  ───────────────────────────────────────────────── */

  const updateFormField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ───────────────────────────────────────────────
     SAVE PLAYER
  ───────────────────────────────────────────────── */

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      await updateDoc(doc(db, "players", playerId), {
        name: form.name || null,
        age: form.age ? Number(form.age) : null,
        nationality: form.nationality || null,
        club: form.club || null,
        league: form.league || null,
        position: form.position || null,
        foot: form.foot || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        strengths: form.strengths.split(",").map((s) => s.trim()).filter(Boolean),
        weaknesses: form.weaknesses.split(",").map((s) => s.trim()).filter(Boolean),
        potentialRating: form.potentialRating ? Number(form.potentialRating) : null,
        overallRating: form.overallRating ? Number(form.overallRating) : null,
        marketValue: form.marketValue ? Number(form.marketValue) : null,
        marketValueSource: form.marketValueSource || null,
        marketValueUrl: form.marketValueUrl || null,
        agency: form.agency || null,
        agencyUrl: form.agencyUrl || null,
        traits: form.traits.split(",").map((s) => s.trim()).filter(Boolean),
      });

      setStatus("✔️ Spieler gespeichert");
    } catch {
      setError("Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  /* ───────────────────────────────────────────────
     IMAGE UPLOAD
  ───────────────────────────────────────────────── */

  const handleImageUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setError(null);
    setStatus(null);

    try {
      const refPath = `players/${playerId}/profile-${Date.now()}`;
      const sRef = storageRef(storage, refPath);

      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      await updateDoc(doc(db, "players", playerId), { imageUrl: url });
      setPlayer((prev) => (prev ? { ...prev, imageUrl: url } : prev));

      setStatus("✔️ Bild aktualisiert");
    } catch {
      setError("Fehler beim Bild-Upload.");
    } finally {
      setImageUploading(false);
    }
  };

  /* ───────────────────────────────────────────────
     VIDEO UPLOAD + LINK
  ───────────────────────────────────────────────── */

  const handleVideoUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploading(true);

    try {
      const refPath = `players/${playerId}/videos/${Date.now()}-${file.name}`;
      const sRef = storageRef(storage, refPath);

      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      const newVid = {
        playerId,
        title: file.name,
        url,
        source: "Upload",
        createdAt: Date.now(),
      };

      const coll = collection(db, "playerVideos");
      const newRef = await addDoc(coll, newVid);

      setVideos((prev) => [...prev, { id: newRef.id, ...newVid }]);
      setStatus("✔️ Video hochgeladen");
    } catch {
      setError("Fehler beim Upload");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleAddVideo = async (e: FormEvent) => {
    e.preventDefault();

    const newVid = {
      playerId,
      title: videoTitle.trim() || "Video",
      url: videoUrl.trim(),
      source: videoSource.trim(),
      createdAt: Date.now(),
    };

    const coll = collection(db, "playerVideos");
    const newRef = await addDoc(coll, newVid);

    setVideos((prev) => [...prev, { id: newRef.id, ...newVid }]);
    setVideoUrl("");
    setVideoTitle("");

    setStatus("✔️ Video hinzugefügt");
  };

  /* ───────────────────────────────────────────────
     DELETE PLAYER
  ───────────────────────────────────────────────── */

  const deletePlayer = async () => {
    if (!confirm("Wirklich löschen?")) return;

    await deleteDoc(doc(db, "players", playerId));
    router.push("/admin/players");
  };

  /* ───────────────────────────────────────────────
     PDF EXPORT (FIXED)
  ───────────────────────────────────────────────── */

  const handleExportPdf = async (mode: "basic" | "full") => {
    if (!playerId) return;

    try {
      setError(null);
      setStatus(null);

      const endpoint =
        mode === "basic"
          ? `/api/export/player/${encodeURIComponent(playerId)}?reports=0`
          : `/api/export/player/${encodeURIComponent(playerId)}?reports=1`;

      const res = await fetch(endpoint);

      if (!res.ok) {
        console.error(await res.text());
        setError("Fehler beim PDF-Export.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const safeName = (player?.name || "player").replace(/[^\w\-]+/g, "_");

      a.href = url;
      a.download =
        mode === "basic"
          ? `${safeName}_profil.pdf`
          : `${safeName}_report.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      setStatus(
        mode === "basic"
          ? "✔️ PDF exportiert"
          : "✔️ PDF (mit Reports) exportiert"
      );
    } catch (err) {
      console.error(err);
      setError("PDF-Export fehlgeschlagen.");
    }
  };

  /* ───────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────── */

  if (loading) return <div className="p-4 text-slate-300">Lade Spieler…</div>;
  if (!player) return <div className="p-4 text-slate-400">Spieler nicht gefunden.</div>;

  const stats = player.stats ?? {
    offensiv: 0,
    defensiv: 0,
    intelligenz: 0,
    physis: 0,
    technik: 0,
    tempo: 0,
  };

  return (
    <div className="space-y-6 p-6">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold">{player.name}</h1>

        <div className="flex flex-wrap gap-3 items-center">

          <button
            onClick={() => handleExportPdf("basic")}
            className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded text-xs font-semibold text-white"
          >
            PDF ohne Reports
          </button>

          <button
            onClick={() => handleExportPdf("full")}
            className="bg-sky-500 hover:bg-sky-400 px-3 py-2 rounded text-xs font-semibold text-slate-900"
          >
            PDF mit Reports
          </button>

          <button
            onClick={toggleFavorite}
            className={`px-4 py-2 rounded text-sm font-semibold ${
              isFavorite ? "bg-yellow-400 text-slate-900" : "bg-slate-700 text-white"
            }`}
          >
            {isFavorite ? "★ Favorit" : "☆ Favorit hinzufügen"}
          </button>

          <button
            onClick={deletePlayer}
            className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded text-sm font-semibold text-slate-900"
          >
            löschen
          </button>
        </div>
      </div>

      {(error || status) && (
        <div className="space-y-1">
          {error && <div className="text-red-400 text-sm">{error}</div>}
          {status && <div className="text-emerald-400 text-sm">{status}</div>}
        </div>
      )}

      {/* REST DER DATEI UNVERÄNDERT … */}
      {/* (Alles ab hier ist identisch mit deinem bisherigen Code) */}

      {/* … */}
    </div>
  );
}