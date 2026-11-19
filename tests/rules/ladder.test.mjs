// Ladder rules tests (Firestore and Storage). Run inside the emulators: `npm run test:rules`.
// Uses its own project id so it can clear data without racing the other rules test files.
import fs from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SLUG = "2026-09-05-acme-research-engineer";
const PDF = `ladder/anand/generated/${SLUG}/Acme - Resume.pdf`;
const RESUME_PDF = "ladder/anand/resume/req1.pdf";

let env;

function ctx(uid, claims = {}) {
  return env.authenticatedContext(uid, {
    email: `${uid}@example.com`,
    email_verified: true,
    firebase: { sign_in_provider: "google.com" },
    ...claims,
  });
}

const users = {
  admin: () => ctx("boss", { admin: true }),
  anand: () => ctx("anand", { apps: ["ladder"], ladderTrackers: ["anand"] }),
  kavya: () => ctx("kavya", { apps: ["ladder"], ladderTrackers: ["kavya"] }),
  noApp: () => ctx("noapp", { apps: ["wealth"], ladderTrackers: ["anand"] }),
  unverified: () => ctx("unv", { email_verified: false, apps: ["ladder"], ladderTrackers: ["anand"] }),
  anon: () => env.authenticatedContext("anon1", { firebase: { sign_in_provider: "anonymous" } }),
  signedOut: () => env.unauthenticatedContext(),
};

const jobRef = (db, tracker = "anand", slug = SLUG) => doc(db, `ladder/${tracker}/jobs/${slug}`);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ladder-rules",
    firestore: { rules: fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf-8") },
    storage: { rules: fs.readFileSync(path.join(ROOT, "storage.rules"), "utf-8") },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (admin) => {
    const db = admin.firestore();
    await setDoc(doc(db, "ladder/anand"), { resume_html: "<p>CV</p>" });
    await setDoc(jobRef(db), {
      slug: SLUG,
      tracker: "anand",
      title: "Research Engineer",
      company: "Acme",
      url: "https://example.com/job",
      status: "new",
      discovered_date: "2026-09-05",
      body_html: "<p>Role</p>",
      // An odd value the worker wrote must not block unrelated user edits.
      applicant_count_label: "Over 200 applicants",
    });
    await setDoc(jobRef(db, "kavya", "2026-09-05-beta-qa-lead"), { status: "new", title: "QA Lead" });
    await setDoc(doc(db, "ladder/anand/companies/acme"), { name: "Acme" });
    await uploadBytes(ref(admin.storage(), PDF), new Uint8Array([37, 80, 68, 70]), { contentType: "application/pdf" });
    await uploadBytes(ref(admin.storage(), RESUME_PDF), new Uint8Array([37, 80, 68, 70]), { contentType: "application/pdf" });
  });
});

describe("ladder access", () => {
  test("a user reads only the trackers listed in their claims", async () => {
    const db = users.anand().firestore();
    await assertSucceeds(getDoc(doc(db, "ladder/anand")));
    await assertSucceeds(getDocs(collection(db, "ladder/anand/jobs")));
    await assertSucceeds(getDoc(doc(db, "ladder/anand/companies/acme")));
    await assertSucceeds(getDocs(collection(db, "ladder/anand/requests")));
    await assertFails(getDoc(doc(db, "ladder/kavya")));
    await assertFails(getDocs(collection(db, "ladder/kavya/jobs")));
    await assertSucceeds(getDocs(collection(users.kavya().firestore(), "ladder/kavya/jobs")));
  });

  test("a verified admin reads every tracker", async () => {
    const db = users.admin().firestore();
    await assertSucceeds(getDoc(jobRef(db)));
    await assertSucceeds(getDocs(collection(db, "ladder/kavya/jobs")));
  });

  test("no ladder app, unverified, anonymous and signed-out users are denied", async () => {
    for (const make of [users.noApp, users.unverified, users.anon, users.signedOut]) {
      const db = make().firestore();
      await assertFails(getDoc(doc(db, "ladder/anand")));
      await assertFails(getDoc(jobRef(db)));
      await assertFails(updateDoc(jobRef(db), { viewed: true }));
    }
  });

  test("unknown trackers are denied even for admins", async () => {
    await assertFails(getDoc(doc(users.admin().firestore(), "ladder/other/jobs/x")));
  });
});

describe("ladder job edits", () => {
  test("user-editable fields can change", async () => {
    const db = users.anand().firestore();
    await assertSucceeds(
      updateDoc(jobRef(db), {
        status: "applied",
        progress_stage: "applied",
        applied_date: "2026-10-14",
        rating: "up",
        viewed: true,
        refresh_requested: true,
        notes: [{ date: "2026-10-14", text: "Called" }],
        apply_prep: [{ question: "Notice?", answer: "1 month" }],
        updated_at: serverTimestamp(),
      }),
    );
    await assertSucceeds(updateDoc(jobRef(db), { rating: deleteField(), decision_date: "2026-10-15" }));
  });

  test("worker-owned fields cannot change", async () => {
    const db = users.anand().firestore();
    for (const patch of [
      { body_html: "<script>x</script>" },
      { title: "CEO" },
      { resume_pdf: "ladder/kavya/generated/x/y.pdf" },
      { resume_requested: true },
      { tracker: "kavya" },
    ]) {
      await assertFails(updateDoc(jobRef(db), patch));
    }
  });

  test("bad values are rejected", async () => {
    const db = users.anand().firestore();
    for (const patch of [
      { status: "hired" },
      { status: deleteField() },
      { rating: "meh" },
      { viewed: "yes" },
      { applied_date: "14/10/2026" },
      { progress_stage: "lunch" },
      { notes: "not a list" },
      { updated_at: new Date("2020-01-01") },
    ]) {
      await assertFails(updateDoc(jobRef(db), patch));
    }
  });

  test("clients cannot create or delete jobs, companies or tracker docs", async () => {
    const db = users.admin().firestore();
    await assertFails(setDoc(jobRef(db, "anand", "2026-10-14-new-job"), { status: "new" }));
    await assertFails(deleteDoc(jobRef(db)));
    await assertFails(setDoc(doc(db, "ladder/anand/companies/new"), { name: "New" }));
    await assertFails(updateDoc(doc(db, "ladder/anand"), { resume_html: "<p>x</p>" }));
  });

  test("a user cannot edit another tracker's jobs", async () => {
    const db = users.anand().firestore();
    await assertFails(updateDoc(jobRef(db, "kavya", "2026-09-05-beta-qa-lead"), { viewed: true }));
  });
});

describe("ladder requests", () => {
  const queued = (uid, extra = {}) => ({
    type: "prepare-materials",
    status: "queued",
    slug: SLUG,
    createdBy: uid,
    createdAt: serverTimestamp(),
    ...extra,
  });

  test("a user queues requests for an existing job, or a scrape", async () => {
    const db = users.anand().firestore();
    const requests = collection(db, "ladder/anand/requests");
    await assertSucceeds(addDoc(requests, queued("anand")));
    await assertSucceeds(addDoc(requests, queued("anand", { type: "refresh-job" })));
    const { slug: _slug, ...scrape } = queued("anand", { type: "scrape", input: { note: "Zurich" } });
    await assertSucceeds(addDoc(requests, scrape));
    await assertSucceeds(addDoc(requests, queued("anand", { type: "score-fit" })));
    const { slug: _s, ...build } = queued("anand", { type: "build-resume" });
    await assertSucceeds(addDoc(requests, build));
  });

  test("requests must be queued, by the caller, now, for a known job and type", async () => {
    const db = users.anand().firestore();
    const requests = collection(db, "ladder/anand/requests");
    for (const bad of [
      queued("anand", { status: "done" }),
      queued("kavya"),
      queued("anand", { createdAt: new Date("2020-01-01") }),
      queued("anand", { slug: "2026-01-01-missing-job" }),
      queued("anand", { type: "delete-everything" }),
      queued("anand", { type: "scrape" }),
      queued("anand", { type: "build-resume" }),
      queued("anand", { error: null }),
    ]) {
      await assertFails(addDoc(requests, bad));
    }
    await assertFails(addDoc(collection(db, "ladder/kavya/requests"), queued("anand")));
  });

  test("clients cannot update or delete requests", async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      await setDoc(doc(admin.firestore(), "ladder/anand/requests/r1"), { ...queued("anand"), createdAt: new Date() });
    });
    const db = users.anand().firestore();
    await assertFails(updateDoc(doc(db, "ladder/anand/requests/r1"), { status: "done" }));
    await assertFails(deleteDoc(doc(db, "ladder/anand/requests/r1")));
  });
});

describe("ladder profile", () => {
  const profileRef = (db, tracker = "anand") => doc(db, `ladder/${tracker}/profile/current`);
  const historyCol = (db, tracker = "anand") => collection(db, `ladder/${tracker}/profile/current/history`);
  const profile = (uid, extra = {}) => ({
    resumeTex: "\\documentclass{article}",
    about: "ML engineer",
    highlights: ["Shipped speech models"],
    skills: ["PyTorch"],
    targetRoles: [{ title: "Research Engineer", seniority: "senior", roleType: "individual_contributor" }],
    industries: [],
    companiesPrefer: [],
    companiesAvoid: [],
    locations: ["London"],
    workMode: ["remote", "hybrid"],
    workAuthorisation: "UK citizen",
    salaryFloor: { amount: 100000, currency: "GBP", period: "year" },
    contractTypes: ["permanent"],
    dealBreakers: [],
    searchSources: ["linkedin"],
    keywords: ["speech"],
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...extra,
  });
  const version = (uid, extra = {}) => ({ resumeTex: "\\documentclass{article}", savedAt: serverTimestamp(), savedBy: uid, ...extra });

  test("the tracker owner reads and writes their profile and adds versions", async () => {
    const db = users.anand().firestore();
    await assertSucceeds(setDoc(profileRef(db), profile("anand")));
    await assertSucceeds(setDoc(profileRef(db), profile("anand", { salaryFloor: null, workMode: [] })));
    await assertSucceeds(getDoc(profileRef(db)));
    await assertSucceeds(addDoc(historyCol(db), version("anand")));
    await assertSucceeds(getDocs(historyCol(db)));
  });

  test("another tracker's user is denied", async () => {
    const db = users.kavya().firestore();
    await assertFails(getDoc(profileRef(db)));
    await assertFails(setDoc(profileRef(db), profile("kavya")));
    await assertFails(addDoc(historyCol(db), version("kavya")));
    await assertFails(getDocs(historyCol(db)));
  });

  test("a verified admin reads and writes any tracker's profile", async () => {
    const db = users.admin().firestore();
    await assertSucceeds(setDoc(profileRef(db, "kavya"), profile("boss")));
    await assertSucceeds(getDoc(profileRef(db, "kavya")));
    await assertSucceeds(addDoc(historyCol(db, "kavya"), version("boss")));
  });

  test("unverified, no-app, anonymous and signed-out users are denied", async () => {
    for (const [make, uid] of [
      [users.unverified, "unv"],
      [users.noApp, "noapp"],
      [users.anon, "anon1"],
      [users.signedOut, "x"],
    ]) {
      const db = make().firestore();
      await assertFails(getDoc(profileRef(db)));
      await assertFails(setDoc(profileRef(db), profile(uid)));
      await assertFails(addDoc(historyCol(db), version(uid)));
    }
  });

  test("invalid profiles are rejected", async () => {
    const db = users.anand().firestore();
    const { keywords: _k, ...missing } = profile("anand");
    for (const bad of [
      missing,
      profile("anand", { extra: true }),
      profile("anand", { updatedBy: "kavya" }),
      profile("anand", { updatedAt: new Date("2020-01-01") }),
      profile("anand", { resumeTex: "x".repeat(200001) }),
      profile("anand", { about: 5 }),
      profile("anand", { skills: "PyTorch" }),
      profile("anand", { skills: Array.from({ length: 101 }, (_, i) => `s${i}`) }),
      profile("anand", { workMode: ["office"] }),
      profile("anand", { contractTypes: ["gig"] }),
      profile("anand", { salaryFloor: { amount: -1, currency: "GBP", period: "year" } }),
      profile("anand", { salaryFloor: { amount: 1, currency: "gbp", period: "year" } }),
      profile("anand", { salaryFloor: { amount: 1, currency: "GBP", period: "week" } }),
    ]) {
      await assertFails(setDoc(profileRef(db), bad));
    }
  });

  test("profiles cannot be deleted and versions are append-only", async () => {
    await env.withSecurityRulesDisabled(async (admin) => {
      const db = admin.firestore();
      await setDoc(profileRef(db), { ...profile("anand"), updatedAt: new Date() });
      await setDoc(doc(db, "ladder/anand/profile/current/history/v1"), { ...version("anand"), savedAt: new Date() });
    });
    const db = users.anand().firestore();
    await assertFails(deleteDoc(profileRef(db)));
    await assertFails(updateDoc(doc(db, "ladder/anand/profile/current/history/v1"), { resumeTex: "x" }));
    await assertFails(deleteDoc(doc(db, "ladder/anand/profile/current/history/v1")));
    for (const bad of [
      version("kavya"),
      version("anand", { savedAt: new Date("2020-01-01") }),
      version("anand", { note: "x" }),
      version("anand", { resumeTex: 1 }),
    ]) {
      await assertFails(addDoc(historyCol(db), bad));
    }
  });
});

describe("ladder storage", () => {
  test("generated files are readable with tracker access only", async () => {
    await assertSucceeds(getBytes(ref(users.anand().storage(), PDF)));
    await assertSucceeds(getBytes(ref(users.admin().storage(), PDF)));
    for (const make of [users.kavya, users.noApp, users.unverified, users.anon, users.signedOut]) {
      await assertFails(getBytes(ref(make().storage(), PDF)));
    }
  });

  test("built resume PDFs are readable with tracker access only", async () => {
    await assertSucceeds(getBytes(ref(users.anand().storage(), RESUME_PDF)));
    await assertSucceeds(getBytes(ref(users.admin().storage(), RESUME_PDF)));
    for (const make of [users.kavya, users.noApp, users.unverified, users.anon, users.signedOut]) {
      await assertFails(getBytes(ref(make().storage(), RESUME_PDF)));
    }
    await assertFails(uploadBytes(ref(users.anand().storage(), "ladder/anand/resume/x.pdf"), new Uint8Array([37])));
  });

  test("clients cannot upload generated files", async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    await assertFails(uploadBytes(ref(users.admin().storage(), `ladder/anand/generated/${SLUG}/x.pdf`), bytes));
    await assertFails(uploadBytes(ref(users.anand().storage(), `ladder/anand/generated/${SLUG}/x.pdf`), bytes));
  });
});
