// Seeds roles/{emailLowercase}. The syncRoleClaims function mirrors each doc into custom claims;
// users who sign in later pick them up via POST /api/account/refresh-claims.
//
// Default: the bootstrap admins (owner, plus the test user from VITE_TEST_USER1_EMAIL).
// --grant-household: instead, every email in family/household.members gets the family,
// materials and planner apps added to its role (other apps, admin and trackers are kept; a missing role is
// created with admin false). "Anand and family" for the restricted apps is the owner plus them.
//
// Emulator (default target; FIRESTORE_EMULATOR_HOST defaults to firebase.json's port):
//   npm run seed-roles
//   npm run seed-roles -- --grant-household
// Production (only when deliberately bootstrapping; needs the explicit flag):
//   GOOGLE_APPLICATION_CREDENTIALS=scripts/new-service-account.json npm run seed-roles -- --production
//   GOOGLE_APPLICATION_CREDENTIALS=scripts/new-service-account.json npm run seed-roles -- --grant-household --production
//
// Emails are never printed, only labels and counts.

import path from "node:path";
import dotenv from "dotenv";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const EMULATOR_HOST = "127.0.0.1:8181";
const ALL_APPS = ["family", "ladder", "wealth", "expense", "time", "share", "materials", "planner", "home", "admin"];
const ALL_TRACKERS = ["anand", "kavya"];
const HOUSEHOLD_APPS = ["family", "materials", "planner"];

interface Role {
  admin: boolean;
  apps: string[];
  ladderTrackers: string[];
  ladderHome?: string;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

async function seedAdmins(db: Firestore, target: string): Promise<void> {
  const owner: Role = { admin: true, apps: ALL_APPS, ladderTrackers: ALL_TRACKERS, ladderHome: "anand" };
  const seeds: Array<[label: string, email: string, role: Role]> = [
    ["owner", "moghan.anand@gmail.com", owner],
  ];
  const testEmail = process.env.VITE_TEST_USER1_EMAIL;
  if (testEmail) seeds.push(["test user", testEmail, owner]);
  else console.warn("VITE_TEST_USER1_EMAIL not set; skipping the test user.");

  for (const [label, email, role] of seeds) {
    await db.doc(`roles/${email.trim().toLowerCase()}`).set(role);
    console.log(`seeded ${label} role (${target})`);
  }
}

async function grantHousehold(db: Firestore, target: string): Promise<void> {
  const household = await db.doc("family/household").get();
  if (!household.exists) throw new Error(`family/household not found (${target}).`);
  const emails = [...new Set(stringList(household.get("members")).map((e) => e.trim().toLowerCase()))].filter(Boolean);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const email of emails) {
    const ref = db.doc(`roles/${email}`);
    const snap = await ref.get();
    const apps = stringList(snap.get("apps"));
    const missing = HOUSEHOLD_APPS.filter((app) => !apps.includes(app));
    if (!snap.exists) {
      await ref.set({ admin: false, apps: HOUSEHOLD_APPS, ladderTrackers: [] } satisfies Role);
      created += 1;
    } else if (missing.length) {
      await ref.update({ apps: [...apps, ...missing] });
      updated += 1;
    } else {
      unchanged += 1;
    }
  }
  console.log(
    `household members: ${emails.length}; roles created ${created}, updated ${updated}, ` +
      `already granted ${unchanged} (${target})`
  );
}

async function main(): Promise<void> {
  const production = process.argv.includes("--production");
  if (production && process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("--production with FIRESTORE_EMULATOR_HOST set; unset one of them.");
  }
  if (!production) process.env.FIRESTORE_EMULATOR_HOST ??= EMULATOR_HOST;
  const projectId = process.env.GCLOUD_PROJECT ?? (production ? "anandmoghan-me" : "demo-anandmoghan-me");
  initializeApp({ projectId });
  const target = production ? projectId : `emulator ${process.env.FIRESTORE_EMULATOR_HOST}`;

  const db = getFirestore();
  if (process.argv.includes("--grant-household")) await grantHousehold(db, target);
  else await seedAdmins(db, target);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
