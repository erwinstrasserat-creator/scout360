// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase Config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// App einmalig initialisieren
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Dienste
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Persistenz & Debug für Browser
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) =>
    console.warn("⚠️ Auth Persistence Error:", err)
  );

  // 🔥 WICHTIG: Für Debug + Login-Status-Check
  (window as any).firebaseApp = app;
  (window as any).firebaseAuth = auth;
  (window as any).firebaseDb = db;
}

export default app;