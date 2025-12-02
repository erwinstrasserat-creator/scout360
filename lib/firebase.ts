import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase Config aus .env.local (ALLE Variablen müssen existieren!)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};

if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  console.warn("⚠️ Firebase Env Variablen fehlen! Prüfe .env.local");
}

// Singleton-Init
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Dienste
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Auth-Persistence nur im Browser
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("⚠️ Auth-Persistence Fehler:", err);
  });
}