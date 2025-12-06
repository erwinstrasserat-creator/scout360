// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

let app: admin.app.App;

/**
 * Admin SDK Initialisierung
 * Läuft auf Vercel, wenn GOOGLE_APPLICATION_CREDENTIALS_JSON gesetzt ist.
 */
if (!admin.apps.length) {
  const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!serviceAccountJson) {
    throw new Error(
      "❌ Fehlende Variable: GOOGLE_APPLICATION_CREDENTIALS_JSON"
    );
  }

  const serviceAccount = JSON.parse(serviceAccountJson);

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();