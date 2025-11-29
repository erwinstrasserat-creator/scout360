"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import type {
  Player,
  ClubNeed,
  NeedAssignment,
} from "../../../../lib/types";

export default function AssignPlayerPage() {
  const { playerId } = useParams() as { playerId: string };
  const router = useRouter();

  const [player, setPlayer] = useState<Player | null>(null);
  const [needs, setNeeds] = useState<ClubNeed[]>([]);
  const [assignments, setAssignments] = useState<NeedAssignment[]>([]);
  const [selectedNeed, setSelectedNeed] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // -----------------------------------------------------------
  // Daten laden
  // -----------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Spieler laden
      const ps = await getDoc(doc(db, "players", playerId));
      if (ps.exists()) {
        setPlayer({ id: ps.id, ...(ps.data() as Player) });
      }

      // Bedarfslisten laden
      const ns = await getDocs(collection(db, "clubNeeds"));
      const needList = ns.docs.map((d) => ({
        id: d.id,
        ...(d.data() as ClubNeed),
      }));
      setNeeds(needList);

      // Bestehende Zuordnungen laden
      const as = await getDocs(collection(db, "needAssignments"));
      const assignList = as.docs.map((d) => ({
        id: d.id,
        ...(d.data() as NeedAssignment),
      }));

      setAssignments(assignList.filter((a) => a.playerId === playerId));

      setLoading(false);
    };

    load();
  }, [playerId]);

  // -----------------------------------------------------------
  // Spieler zu Bedarfsliste zuordnen
  // -----------------------------------------------------------
  const assign = async () => {
    if (!selectedNeed) {
      setStatus("Bitte eine Bedarfsliste auswählen.");
      return;
    }

    if (assignments.some((a) => a.needId === selectedNeed)) {
      setStatus("Spieler ist dieser Bedarfsliste bereits zugeordnet.");
      return;
    }

    try {
      setSaving(true);
      setStatus("Speichere Zuordnung...");

      await addDoc(collection(db, "needAssignments"), {
        needId: selectedNeed,
        playerId,
        createdAt: Date.now(),
      });

      setStatus("Spieler erfolgreich zugeordnet.");
      setSaving(false);

      // Nach erfolgreicher Zuordnung zurück
      setTimeout(() => {
        router.push(`/players/${playerId}`);
      }, 800);
    } catch (e) {
      console.error(e);
      setStatus("Fehler beim Speichern.");
      setSaving(false);
    }
  };

  // -----------------------------------------------------------
  // Render
  // -----------------------------------------------------------
  if (!player) {
    return (
      <main className="p-6 text-red-400">Spieler nicht gefunden.</main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">
        Spieler Bedarfsliste zuordnen
      </h1>

      <Link
        href={`/players/${playerId}`}
        className="text-slate-400 hover:text-slate-200 text-sm"
      >
        ← zurück zum Spielerprofil
      </Link>

      {/* SPIELERINFO */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-semibold">{player.name}</h2>
        <p className="text-slate-400 text-sm">
          {player.age} Jahre • {player.position} • {player.club}
        </p>
      </section>

      {/* STATUS */}
      {status && (
        <p className="text-sm text-emerald-400">{status}</p>
      )}

      {/* AUSWAHL */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Bedarfsliste auswählen</h2>

        {needs.length === 0 && (
          <p className="text-slate-500 text-sm">
            Noch keine Bedarfslisten erstellt.
          </p>
        )}

        <select
          value={selectedNeed}
          onChange={(e) => setSelectedNeed(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm w-full"
        >
          <option value="">Bitte auswählen...</option>
          {needs.map((n) => (
            <option key={n.id} value={n.id}>
              {n.clubName} — {n.position}
            </option>
          ))}
        </select>

        <button
          onClick={assign}
          disabled={saving}
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Speichere..." : "Zuordnen"}
        </button>
      </section>

      {/* BEREITS ZUGEORDNET */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
        <h2 className="text-lg font-semibold">Bereits zugeordnet</h2>

        {assignments.length === 0 && (
          <p className="text-slate-500 text-sm">Keine Zuordnungen.</p>
        )}

        {assignments.map((a) => (
          <div
            key={a.id}
            className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-sm"
          >
            <p className="text-slate-100">{a.needId}</p>
            <p className="text-xs text-slate-500">
              Zugeordnet am{" "}
              {new Date(a.createdAt).toLocaleDateString("de-DE")}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}