// ---------------------------------------------------------
// FOOT
// ---------------------------------------------------------
export type Foot = "links" | "rechts" | "beidfüßig";

// ---------------------------------------------------------
// PLAYER STATS
// ---------------------------------------------------------
export interface PlayerStats {
  technik: number;       // 0-100
  tempo: number;         // 0-100
  physis: number;        // 0-100
  intelligenz: number;   // 0-100
  defensiv: number;      // 0-100
  offensiv: number;      // 0-100
}

// ---------------------------------------------------------
// PLAYER MODEL
// ---------------------------------------------------------
export interface Player {
  id: string;

  // Basisdaten
  name: string;
  age: number;
  nationality: string;
  club: string;
  league: string;
  position: string;
  foot: Foot;
  heightCm?: number;

  // Scouting
  strengths: string[];
  weaknesses: string[];

  // Ratings
  potentialRating: number;
  overallRating?: number; // optionaler Gesamtwert 0–100

  // Detail-Stats (Radar)
  stats: PlayerStats;

  // Marktwert & Management
  marketValue?: number;
  marketValueSource?: string;
  marketValueUrl?: string;
  agency?: string;
  agencyUrl?: string;

  // Bild
  imageUrl?: string;
}

// ---------------------------------------------------------
// VIDEO eines Spielers
// ---------------------------------------------------------
export interface PlayerVideo {
  id: string;
  playerId: string;
  title: string;
  url: string;
  source?: string;      // z.B. "YouTube"
  createdAt?: number;   // Unix-Timestamp
  addedByUid?: string;
}

// ---------------------------------------------------------
// FAVORIT eines Videos (pro User)
// ---------------------------------------------------------
export interface VideoFavorite {
  id: string;
  userId: string;
  playerId: string;
  videoId: string;
  playerName: string;
  videoTitle: string;
  videoUrl: string;
  createdAt?: number;
}

// ---------------------------------------------------------
// CLUB MODEL
// ---------------------------------------------------------
export interface Club {
  id: string;
  name: string;
  country?: string;
  level?: string;
  notes?: string;
}

// ---------------------------------------------------------
// BEDARFSLISTE eines Vereins
// ---------------------------------------------------------
export interface ClubNeed {
  id: string;

  clubId?: string;
  clubName: string;

  position: string;

  // Altersrange
  minAge?: number;
  maxAge?: number;

  // Größenanforderung
  heightMin?: number;
  heightMax?: number;

  // Wie viel unter Mindest-Stat erlaubt (%)
  tolerance: number;

  // Bevorzugter Fuß (oder egal)
  preferredFoot?: Foot | "egal";

  // Gesuchte Merkmale (z.B. "Kopfballstark", "Schnell")
  requiredTraits: string[];

  // Mindest-Stats pro Kategorie
  minStats?: Partial<PlayerStats>;

  notes?: string;

  createdAt: number;
}

// ---------------------------------------------------------
// ZUORDNUNG: Spieler -> Bedarfsliste
// ---------------------------------------------------------
export interface NeedAssignment {
  id: string;
  needId: string;
  playerId: string;
  createdAt: number;
}

// ---------------------------------------------------------
// SCOUTING REPORT
// ---------------------------------------------------------
export interface ScoutingReport {
  id: string;

  // Spieler
  playerId: string;

  // Autor
  createdBy: string;        // UID des Users
  createdByEmail: string;   // E-Mail
  createdAt: number;

  // Matchdaten
  matchDate?: string;       // "2025-03-31"
  opponent?: string;
  competition?: string;
  minutesObserved?: number | null;

  // Bewertung gesamt (1–5)
  rating: number;

  // Form
  currentForm: "sehr gut" | "gut" | "durchschnittlich" | "schwach";

  // Empfehlung
  recommendation: "sofort verpflichten" | "beobachten" | "nicht geeignet";

  // Freitext
  notes: string;
}
