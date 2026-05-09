import "server-only";

import {
  cert,
  getApps,
  initializeApp,
  applicationDefault,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Server-only Firebase Admin SDK init. NEVER import this from a client
 * component — `import "server-only"` makes the build fail if you try.
 *
 * Credentials are read from one of (in order):
 *   1. FIREBASE_SERVICE_ACCOUNT — a JSON blob (the entire service-account file)
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   3. Application Default Credentials (e.g. gcloud auth login locally)
 *
 * Vercel: set these as Production + Preview env vars. Newlines in the
 * private key must be encoded as `\n`.
 */
function loadCredentials(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (json) {
    try {
      const parsed = JSON.parse(json);
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      };
    } catch (err) {
      console.error("FIREBASE_SERVICE_ACCOUNT did not parse as JSON", err);
    }
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

if (!getApps().length) {
  const creds = loadCredentials();
  if (creds) {
    initializeApp({ credential: cert(creds), projectId: creds.projectId });
  } else {
    // Fall back to ADC; useful during local dev with `gcloud auth
    // application-default login`. Will throw at request time if missing.
    initializeApp({ credential: applicationDefault() });
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();

export const INITIAL_ADMIN_EMAILS = (process.env.INITIAL_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
