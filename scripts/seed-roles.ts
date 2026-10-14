// Seeds roles/{emailLowercase} with the bootstrap admins. The syncRoleClaims function mirrors
// each doc into custom claims; users who sign in later pick them up via
// POST /api/account/refresh-claims.
//
// Emulator (default target):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed-roles
// Production (only when deliberately bootstrapping; needs the explicit flag):
//   GOOGLE_APPLICATION_CREDENTIALS=scripts/new-service-account.json npm run seed-roles -- --production
//
// The test user's email is read from VITE_TEST_USER1_EMAIL (environment or .env.local) and is
// never printed.

import path from "node:path";
import dotenv from "dotenv";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const ALL_APPS = ["family", "ladder", "wealth", "expense", "time", "share", "admin"];
const ALL_TRACKERS = ["anand", "kavya"];

interface Role {
  admin: boolean;
  apps: string[];
  ladderTrackers: string[];
}

async function main(): Promise<void> {
  const emulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (!emulator && !process.argv.includes("--production")) {
    throw new Error("Set FIRESTORE_EMULATOR_HOST, or pass --production to write to the live project.");
  }
  const projectId = process.env.GCLOUD_PROJECT ?? (emulator ? "demo-anandmoghan-me" : "anandmoghan-me");
  initializeApp({ projectId });

  const owner: Role = { admin: true, apps: ALL_APPS, ladderTrackers: ALL_TRACKERS };
  const seeds: Array<[label: string, email: string, role: Role]> = [
    ["owner", "moghan.anand@gmail.com", owner],
  ];
  const testEmail = process.env.VITE_TEST_USER1_EMAIL;
  if (testEmail) seeds.push(["test user", testEmail, owner]);
  else console.warn("VITE_TEST_USER1_EMAIL not set; skipping the test user.");

  const db = getFirestore();
  for (const [label, email, role] of seeds) {
    await db.doc(`roles/${email.trim().toLowerCase()}`).set(role);
    console.log(`seeded ${label} role (${emulator ? "emulator" : projectId})`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
