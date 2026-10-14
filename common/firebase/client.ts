import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

// Local stack (npm run emulators, npm run dev:emulated): NEXT_PUBLIC_USE_EMULATORS=true points every
// SDK at the Firebase emulators and never at the live project. Ports match firebase.json.
export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
const EMULATOR_PROJECT_ID = 'demo-anandmoghan-me';
const EMULATOR_HOST = '127.0.0.1';
const PORTS = { auth: 9098, firestore: 8181, storage: 9199, functions: 5001 };

/**
 * Base URL of the `api` Cloud Function. Production and preview use the same-origin Hosting rewrite
 * (`/api`). `next dev` does not apply rewrites, so emulator mode calls the functions emulator; the
 * function routes on `/api/...`, hence the doubled segment (function name, then route prefix).
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (USE_EMULATORS ? `http://${EMULATOR_HOST}:${PORTS.functions}/${EMULATOR_PROJECT_ID}/us-central1/api/api` : '/api');

// Static prerender runs with the same env, but must never talk to Firebase.
// Nothing here runs at import time: call these getters inside effects, event
// handlers or hooks (client-side only). Firebase's own getApp()/getAuth()/
// getFirestore() are idempotent, so no module-level cache is needed.
function readConfig() {
  if (USE_EMULATORS) {
    return {
      apiKey: 'demo-api-key',
      authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
      projectId: EMULATOR_PROJECT_ID,
      storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com`,
      appId: 'demo-app-id',
    };
  }
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey || !config.projectId) {
    throw new Error('Missing NEXT_PUBLIC_FIREBASE_* environment variables.');
  }
  return config;
}

// Every SDK is pointed at its emulator once, when the app is created and before any use: the
// Firestore and Storage SDKs throw if their emulator is connected after the first request.
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  const app = initializeApp(readConfig());
  if (USE_EMULATORS) {
    connectAuthEmulator(getAuth(app), `http://${EMULATOR_HOST}:${PORTS.auth}`, { disableWarnings: true });
    connectFirestoreEmulator(getFirestore(app), EMULATOR_HOST, PORTS.firestore);
    connectStorageEmulator(getStorage(app), EMULATOR_HOST, PORTS.storage);
    connectFunctionsEmulator(getFunctions(app, 'us-central1'), EMULATOR_HOST, PORTS.functions);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  // In emulator mode the Auth emulator also serves the fake Google popup (signInWithPopup).
  return getAuth(getFirebaseApp());
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

export function getFirebaseFunctions(): Functions {
  return getFunctions(getFirebaseApp(), 'us-central1');
}
