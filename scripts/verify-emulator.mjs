import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, connectFirestoreEmulator, getDoc, doc, getDocs, getFirestore, query, where } from "firebase/firestore";

const env = Object.fromEntries(
  readFileSync(".env.emulator.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=")),
);
const app = initializeApp({ apiKey: "demo", projectId: "demo-anandmoghan-me" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8181);

async function can(label, fn, expected) {
  let ok = true;
  try {
    await fn();
  } catch {
    ok = false;
  }
  console.log(`${ok === expected ? "PASS" : "FAIL"} ${label}: ${ok ? "allowed" : "denied"}`);
  if (ok !== expected) process.exitCode = 1;
}

const expectations = {
  ADMIN: { roles: true, household: true, visits: true, comments: true },
  MEMBER: { roles: false, household: true, visits: false, comments: true },
  PLAIN: { roles: false, household: false, visits: false, comments: true },
};
let adminUid = "";
for (const [key, want] of Object.entries(expectations)) {
  const cred = await signInWithEmailAndPassword(auth, env[`EMULATOR_${key}_EMAIL`], env[`EMULATOR_${key}_PASSWORD`]);
  if (key === "ADMIN") adminUid = cred.user.uid;
  const claims = (await cred.user.getIdTokenResult(true)).claims;
  console.log(key, "claims", JSON.stringify({ admin: claims.admin, apps: claims.apps, trackers: claims.ladderTrackers, verified: claims.email_verified }));
  await can(`${key} roles`, () => getDocs(collection(db, "roles")), want.roles);
  await can(`${key} family orders`, () => getDocs(collection(db, "family/household/orders")), want.household);
  await can(`${key} visits`, () => getDocs(collection(db, "visits")), want.visits);
  await can(`${key} post comments`, () => getDocs(query(collection(db, "posts/flow-matching-speech-generation/comments"), where("status", "==", "visible"))), want.comments);
  await can(`${key} admin wealth root doc`, () => getDoc(doc(db, `wealth/${adminUid}`)), key === "ADMIN");
  const url = "http://127.0.0.1:5001/demo-anandmoghan-me/us-central1/api/api/account/refresh-claims";
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await cred.user.getIdToken()}`, "Content-Type": "application/json" },
    body: "{}",
  });
  console.log(`${res.ok ? "PASS" : "FAIL"} ${key} api refresh-claims via functions emulator: ${res.status} ${await res.text()}`);
  if (!res.ok) process.exitCode = 1;
}
process.exit(process.exitCode ?? 0);
