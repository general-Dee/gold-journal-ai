import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export function getAdminAuth() {
  return getAuth(initAdminApp());
}

export function getAdminDb() {
  return getFirestore(initAdminApp());
}
