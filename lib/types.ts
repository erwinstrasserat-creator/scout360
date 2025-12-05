// ---------------------------------------------------------
// FOOT
// ---------------------------------------------------------
export type Foot = "links" | "rechts" | "beidfüßig";

// ---------------------------------------------------------
// PLAYER STATS (0–100)
// ---------------------------------------------------------
export interface PlayerStats {
  technik: number;       
  tempo: number;         
  physis: number;        
  intelligenz: number;   
  defensiv: number;      
  offensiv: number;      
}

// ---------------------------------------------------------
// PLAYER MODEL – angepasst für API-Football Import
// ---------------------------------------------------------
export interface Player {
  id?: string;              // Firestore-ID optional

  // Basisdaten
  apiId?: number;           // API-Football-ID
  name: string;
  age: number | null;
  nationality?: string | null;
  club: string | null;
  league: string | null;
  position: string | null;
  foot: Foot | null;
  heightCm?: number | null;

  // Scouting
  strengths?: string[];     
  weaknesses?: string[];

  // Ratings
  potentialRating?: number;
  overallRating?: number; 

  // Detail-Stats (Radar / Spider)
  stats: PlayerStats;

  // Marktwert
  marketValue?: number | null;
  marketValueSource?: string;
  marketValueUrl?: string;
  agency?: string;
  agencyUrl?: string;

  // Bild vom API-Football
  photo?: string | null;

  // ⚠️ NEU (für hochgeladenes Profilbild / Edit Player Page)
  imageUrl?: string | null;

  // Loan
  onLoan?: boolean;
  loanFrom?: string | null;

  // Traits
  traits?: string[];
}

// ---------------------------------------------------------
// VIDEO eines Spielers
// ---------------------------------------------------------
export interface PlayerVideo {
  id: string;
  playerId: string;
  title: string;
  url: string;
  source?: string;
  createdAt?: number;
  addedByUid?: string;
}

// ---------------------------------------------------------
// FAVORIT eines Videos
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

  minAge?: number;
  maxAge?: number;

  heightMin?: number;
  heightMax?: number;

  tolerance: number;

  preferredFoot?: Foot | "egal";

  requiredTraits: string[];

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

  playerId: string;

  createdBy: string;
  createdByEmail: string;
  createdAt: number;

  matchDate?: string;
  opponent?: string;
  competition?: string;
  minutesObserved?: number | null;

  rating: number;

  currentForm: "sehr gut" | "gut" | "durchschnittlich" | "schwach";

  recommendation: "sofort verpflichten" | "beobachten" | "nicht geeignet";

  notes: string;
}