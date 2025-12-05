// app/admin/players/[id]/page.tsx
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

  // Admin-Manuell
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

/* ──────────────────────────────────────────────── */

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

  /* ────────────────────────────────────────────────
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
          potentialRating:
            data.potentialRating != null ? String(data.potentialRating) : "",
          overallRating:
            data.overallRating != null ? String(data.overallRating) : "",
          marketValue:
            data.marketValue != null ? String(data.marketValue) : "",
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
        setError("Fehler beim Laden der Daten.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [playerId]);

  /* ────────────────────────────────────────────────
     FIXTURES LADEN
  ───────────────────────────────────────────────── */

  const loadFixtures = async () => {
    if (!player?.apiTeamId) return;

    setIsLoadingFixtures(true);

    try {
      const res = await fetch(
        `/api/fixtures/upcoming?teamId=${player.apiTeamId}&limit=4`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        setStatus("⚠️ Fehler beim Laden der Fixtures.");
        return;
      }

      const data: Fixture[] = await res.json();
      setFixtures(data);
    } catch (err) {
      console.error(err);
      setStatus("⚠️ Fehler beim Laden der Fixtures.");
    } finally {
      setIsLoadingFixtures(false);
    }
  };

  useEffect(() => {
    if (player?.apiTeamId) {
      loadFixtures();
    }
  }, [player?.apiTeamId]);

  /* ────────────────────────────────────────────────
     FAVORIT HINZUFÜGEN / ENTFERNEN
  ───────────────────────────────────────────────── */

  const toggleFavorite = async () => {
    if (!player) return;

    const favRef = collection(db, "favoritePlayers");

    if (isFavorite) {
      const qFav = query(favRef, where("playerId", "==", playerId));
      const snap = await getDocs(qFav);
      for (const d of snap.docs) await deleteDoc(d.ref);
      setIsFavorite(false);
      setStatus("❌ Aus Favoriten entfernt");
      return;
    }

    const favDoc = {
      playerId,
      name: player.name ?? "",
      club: player.club ?? "",
      league: player.league ?? "",
      imageUrl: player.imageUrl ?? null,
      createdAt: Date.now(),
    };
    await addDoc(favRef, favDoc);

    setIsFavorite(true);
    setStatus("⭐ Zu Favoriten hinzugefügt");
  };

  /* ────────────────────────────────────────────────
     FORM UPDATE
  ───────────────────────────────────────────────── */

  const updateFormField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ────────────────────────────────────────────────
     PLAYER SAVE
  ───────────────────────────────────────────────── */

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerId) return;

    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      const ref = doc(db, "players", playerId);

      await updateDoc(ref, {
        name: form.name || null,
        age: form.age ? Number(form.age) : null,
        nationality: form.nationality || null,
        club: form.club || null,
        league: form.league || null,
        position: form.position || null,
        foot: form.foot || null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,

        strengths: form.strengths
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),

        weaknesses: form.weaknesses
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),

        potentialRating: form.potentialRating
          ? Number(form.potentialRating)
          : null,
        overallRating: form.overallRating
          ? Number(form.overallRating)
          : null,

        marketValue: form.marketValue ? Number(form.marketValue) : null,
        marketValueSource: form.marketValueSource || null,
        marketValueUrl: form.marketValueUrl || null,

        agency: form.agency || null,
        agencyUrl: form.agencyUrl || null,

        traits: form.traits
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });

      setStatus("✔️ Spieler gespeichert");
    } catch (err) {
      console.error(err);
      setError("Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  /* ────────────────────────────────────────────────
     IMAGE UPLOAD
  ───────────────────────────────────────────────── */

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !playerId) return;

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
    } catch (err) {
      console.error(err);
      setError("Fehler beim Bild-Upload");
    } finally {
      setImageUploading(false);
    }
  };

  /* ────────────────────────────────────────────────
     VIDEO UPLOAD / VIDEO ADD LINK
  ───────────────────────────────────────────────── */

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !playerId) return;

    setVideoUploading(true);
    setError(null);
    setStatus(null);

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
    } catch (err) {
      console.error(err);
      setError("Fehler beim Video-Upload");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleAddVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || !playerId) return;

    const newVid = {
      playerId,
      title: videoTitle.trim() || "Video",
      url: videoUrl.trim(),
      source: videoSource.trim() || "Link",
      createdAt: Date.now(),
    };

    const coll = collection(db, "playerVideos");
    const newRef = await addDoc(coll, newVid);

    setVideos((prev) => [...prev, { id: newRef.id, ...newVid }]);
    setVideoUrl("");
    setVideoTitle("");
    setStatus("✔️ Video-Link hinzugefügt");
  };

  /* ────────────────────────────────────────────────
     DELETE PLAYER
  ───────────────────────────────────────────────── */

  const deletePlayer = async () => {
    if (!confirm("Diesen Spieler wirklich löschen?")) return;
    await deleteDoc(doc(db, "players", playerId));
    router.push("/admin/players");
  };

  /* ────────────────────────────────────────────────
     PDF EXPORT
  ───────────────────────────────────────────────── */

  const handleExportPdf = async (mode: "basic" | "full") => {
    if (!playerId) return;

    try {
      setStatus(null);
      setError(null);

      const res = await fetch(
        `/api/export/player/pdf?playerId=${playerId}&mode=${mode}`
      );

      if (!res.ok) {
        const txt = await res.text();
        console.error("PDF Export error:", txt);
        setError("Fehler beim PDF-Export.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      const baseName = (player?.name || "player").replace(
        /[^\w\-]+/g,
        "_"
      );
      a.download =
        mode === "basic"
          ? `${baseName}_profil.pdf`
          : `${baseName}_report.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus(
        mode === "basic"
          ? "✔️ PDF (ohne Reports) exportiert."
          : "✔️ PDF (mit Reports) exportiert."
      );
    } catch (err) {
      console.error(err);
      setError("Fehler beim PDF-Export.");
    }
  };

  /* ────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────── */

  if (loading) {
    return <div className="p-4 text-slate-300">Lade Spieler…</div>;
  }

  if (!player) {
    return (
      <div className="p-4 text-slate-400">Spieler nicht gefunden</div>
    );
  }

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
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl font-bold">{player.name}</h1>

        <div className="flex flex-wrap gap-3 items-center">
          {/* PDF Buttons */}
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

          {/* Favorite / Delete */}
          <button
            onClick={toggleFavorite}
            className={`px-4 py-2 rounded text-sm font-semibold ${
              isFavorite
                ? "bg-yellow-400 text-slate-900"
                : "bg-slate-700 text-white"
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
          {status && (
            <div className="text-emerald-400 text-sm">{status}</div>
          )}
        </div>
      )}

      {/* GRID: INFO + VIDEOS */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT: PLAYER INFO + FORM */}
        <div className="lg:col-span-2 space-y-6">
          {/* IMAGE + BASIC INFO */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                {player.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={player.imageUrl}
                    className="w-full h-full object-cover"
                    alt={player.name ?? "Player"}
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    kein Bild
                  </span>
                )}
              </div>

              <label className="text-xs text-slate-300 flex flex-col items-center">
                Bild hochladen
                <input
                  type="file"
                  accept="image/*"
                  disabled={imageUploading}
                  onChange={handleImageUpload}
                />
              </label>
              {imageUploading && (
                <span className="text-[11px] text-slate-400">
                  lade…
                </span>
              )}
            </div>

            <div className="flex-1 text-sm text-slate-300 space-y-1">
              <div>
                <b>Name:</b> {player.name}
              </div>
              <div>
                <b>Alter:</b> {player.age ?? "-"}
              </div>
              <div>
                <b>Nation:</b> {player.nationality ?? "-"}
              </div>
              <div>
                <b>Verein:</b> {player.club ?? "-"}
              </div>
              <div>
                <b>Liga:</b> {player.league ?? "-"}
              </div>
              <div>
                <b>Position:</b> {player.position ?? "-"}
              </div>
              <div>
                <b>Fuß:</b> {player.foot ?? "-"}
              </div>
              <div>
                <b>Größe:</b>{" "}
                {player.heightCm ? player.heightCm + " cm" : "-"}
              </div>
              <div>
                <b>Leihe:</b>{" "}
                {player.onLoan
                  ? `ja – von ${player.loanFrom ?? "?"}`
                  : "nein"}
              </div>
            </div>
          </div>

          {/* SCOUTING INFO – FIXTURES */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">
                Scouting Info – nächste Spiele
              </h2>
              <button
                onClick={loadFixtures}
                disabled={!player.apiTeamId || isLoadingFixtures}
                className="text-xs bg-sky-500 px-3 py-1 rounded text-slate-900 disabled:opacity-50"
              >
                {isLoadingFixtures ? "lädt…" : "aktualisieren"}
              </button>
            </div>

            {!player.apiTeamId && (
              <div className="text-sm text-slate-400">
                ⚠️ Kein Team-ID verfügbar – Fixtures nicht möglich.
              </div>
            )}

            {player.apiTeamId && fixtures.length === 0 && (
              <div className="text-sm text-slate-400">
                Keine Spiele gefunden.
              </div>
            )}

            <div className="space-y-2">
              {fixtures.map((f) => (
                <div
                  key={f.fixture.id}
                  className="border border-slate-700 p-2 rounded text-sm text-slate-300"
                >
                  <div className="font-semibold">
                    {f.league.name}
                  </div>
                  <div>
                    {f.teams.home.name} – {f.teams.away.name}
                  </div>
                  <div className="text-slate-400 text-xs">
                    {new Date(f.fixture.date).toLocaleString("de-AT")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EDIT FORM */}
          <form
            onSubmit={handleSave}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4"
          >
            <h2 className="text-lg font-semibold">Spieler bearbeiten</h2>

            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {(
                [
                  ["name", "Name"],
                  ["age", "Alter"],
                  ["nationality", "Nationalität"],
                  ["club", "Verein"],
                  ["league", "Liga"],
                  ["position", "Position"],
                  ["foot", "Fuß"],
                  ["heightCm", "Größe (cm)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-slate-400">
                    {label}
                  </label>
                  <input
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                    value={(form as any)[key]}
                    onChange={(e) =>
                      updateFormField(key, e.target.value)
                    }
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400">
                  Stärken (kommagetrennt)
                </label>
                <input
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                  value={form.strengths}
                  onChange={(e) =>
                    updateFormField("strengths", e.target.value)
                  }
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400">
                  Schwächen (kommagetrennt)
                </label>
                <input
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                  value={form.weaknesses}
                  onChange={(e) =>
                    updateFormField("weaknesses", e.target.value)
                  }
                />
              </div>

              {(
                [
                  ["potentialRating", "Potential Rating (0–100)"],
                  ["overallRating", "Overall Rating (0–100)"],
                  ["marketValue", "Marktwert"],
                  ["marketValueSource", "Marktwert Quelle"],
                  ["marketValueUrl", "Marktwert URL"],
                  ["agency", "Agentur"],
                  ["agencyUrl", "Agentur URL"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-slate-400">
                    {label}
                  </label>
                  <input
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                    value={(form as any)[key]}
                    onChange={(e) =>
                      updateFormField(key, e.target.value)
                    }
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <label className="text-xs text-slate-400">
                  Traits (kommagetrennt)
                </label>
                <input
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                  value={form.traits}
                  onChange={(e) =>
                    updateFormField("traits", e.target.value)
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 text-slate-900 px-4 py-2 rounded font-semibold disabled:opacity-50"
            >
              {saving ? "Speichere…" : "Speichern"}
            </button>
          </form>

          {/* SCOUTING STATS */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            <h2 className="text-lg font-semibold mb-2">
              Scouting-Stats (API)
            </h2>
            <div className="grid md:grid-cols-3 gap-2">
              <div>Offensiv: {stats.offensiv}</div>
              <div>Defensiv: {stats.defensiv}</div>
              <div>Intelligenz: {stats.intelligenz}</div>
              <div>Physis: {stats.physis}</div>
              <div>Technik: {stats.technik}</div>
              <div>Tempo: {stats.tempo}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN – VIDEOS */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-lg font-semibold mb-3">Videos</h2>

            <div className="text-xs text-slate-300 space-y-1 mb-3">
              <div>Video-Datei hochladen:</div>
              <input
                type="file"
                accept="video/*"
                disabled={videoUploading}
                onChange={handleVideoUpload}
              />
              {videoUploading && (
                <div className="text-[11px] text-slate-400">lade…</div>
              )}
            </div>

            <form
              onSubmit={handleAddVideo}
              className="space-y-2 text-sm mb-4"
            >
              <div>
                <label className="text-xs text-slate-400">
                  Titel
                </label>
                <input
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">
                  Video-URL
                </label>
                <input
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">
                  Quelle
                </label>
                <input
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                  value={videoSource}
                  onChange={(e) => setVideoSource(e.target.value)}
                />
              </div>

              <button className="bg-sky-500 text-slate-900 px-3 py-1 rounded text-xs mt-1">
                Hinzufügen
              </button>
            </form>

            <div className="space-y-2">
              {videos.length === 0 && (
                <div className="text-xs text-slate-400">
                  Keine Videos
                </div>
              )}

              {videos.map((v) => (
                <div
                  key={v.id}
                  className="border border-slate-800 rounded-lg p-2 text-xs text-slate-200 space-y-1"
                >
                  <div className="font-semibold">
                    {v.title || "Video"}
                  </div>
                  <a
                    className="underline break-all text-slate-400"
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {v.url}
                  </a>
                  {v.source && (
                    <div className="text-[11px] text-slate-500">
                      Quelle: {v.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}