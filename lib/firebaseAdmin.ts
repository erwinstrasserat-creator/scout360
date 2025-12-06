// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

/**
 * Initialisiert das Admin SDK erst beim ersten Zugriff.
 * (Nie während des Builds!)
 */
function initAdmin() {
  if (adminApp) return adminApp;

  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!json) {
    console.warn("⚠️ GOOGLE_APPLICATION_CREDENTIALS_JSON fehlt!");
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
  }

  const creds = JSON.parse(json);

  adminApp = admin.initializeApp({
    credential: admin.credential.cert(creds),
  });

  return adminApp;
}

/** Firestore Admin */
export function getAdminDb() {
  const app = initAdmin();
  return admin.firestore(app);
}

/** Auth Admin */
export function getAdminAuth() {
  const app = initAdmin();
  return admin.auth(app);
}