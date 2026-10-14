// Firestore rules tests. Run inside the emulator: `npm run test:rules`.
import fs from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FAMILY_EMAIL = "member@example.com";

let env;

function anon(uid) {
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();
}

function real(uid, claims = {}) {
  return env
    .authenticatedContext(uid, {
      email: `${uid}@example.com`,
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
      ...claims,
    })
    .firestore();
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-anandmoghan-me",
    firestore: { rules: fs.readFileSync(path.join(ROOT, "firestore.rules"), "utf-8") },
  });
});

after(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "roles/someone@example.com"), { admin: false, apps: ["wealth"], ladderTrackers: [] });
    await setDoc(doc(db, "users/alice"), { isAnonymous: false, email: "alice@example.com" });
    await setDoc(doc(db, "users/anon1"), { isAnonymous: true });
    await setDoc(doc(db, "family/household"), { members: [FAMILY_EMAIL] });
    await setDoc(doc(db, "family/household/feed/f1"), { status: "unread" });
    for (const [area, person] of [["parenting", "nila"], ["fitness", "anand"], ["health", "kavya"]]) {
      await setDoc(doc(db, `family/household/${area}/${person}/views/meta`), { person });
    }
    await setDoc(doc(db, "wealth/alice"), { a: 1 });
  });
});

describe("roles", () => {
  test("verified admin reads and writes", async () => {
    const db = real("boss", { admin: true });
    await assertSucceeds(getDoc(doc(db, "roles/someone@example.com")));
    await assertSucceeds(setDoc(doc(db, "roles/new@example.com"), { admin: false, apps: [], ladderTrackers: [] }));
  });

  test("admin claim without a verified email is denied", async () => {
    const db = real("boss", { admin: true, email_verified: false });
    await assertFails(getDoc(doc(db, "roles/someone@example.com")));
  });

  test("non-admin, anonymous and signed-out users are denied", async () => {
    for (const db of [real("alice"), anon("anon1"), env.unauthenticatedContext().firestore()]) {
      await assertFails(getDoc(doc(db, "roles/someone@example.com")));
      await assertFails(setDoc(doc(db, "roles/alice@example.com"), { admin: true, apps: [], ladderTrackers: [] }));
    }
  });
});

describe("users", () => {
  test("anonymous owner creates, reads and updates their own doc", async () => {
    const db = anon("anon2");
    await assertSucceeds(setDoc(doc(db, "users/anon2"), { isAnonymous: true, createdAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(db, "users/anon2")));
    await assertSucceeds(updateDoc(doc(db, "users/anon2"), { consent: "granted" }));
    await assertFails(updateDoc(doc(db, "users/anon2"), { visitCount: 99 }));
    await assertFails(updateDoc(doc(db, "users/anon2"), { lastSeenAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, "users/anon2/prefs/p"), { th: "dark" }));
  });

  test("the owner sets and edits a validated nickname", async () => {
    const db = anon("anon3");
    await assertFails(setDoc(doc(db, "users/anon3"), { isAnonymous: true, displayName: "x" }));
    await assertSucceeds(setDoc(doc(db, "users/anon3"), { isAnonymous: true, displayName: "guest-7f3a" }));
    await assertSucceeds(updateDoc(doc(db, "users/anon3"), { displayName: "Bob the_reader-2" }));
    for (const bad of ["x", "a".repeat(31), "bad<name>", " lead", "trail ", "émile", 42, null]) {
      await assertFails(updateDoc(doc(db, "users/anon3"), { displayName: bad }));
    }
    await assertSucceeds(updateDoc(doc(db, "users/anon3"), { displayName: "a".repeat(30) }));
    await assertFails(updateDoc(doc(anon("anon4"), "users/anon3"), { displayName: "Mallory" }));
  });

  test("a legacy name that breaks the rule does not block other updates", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/carol"), { isAnonymous: false, displayName: "Carol O'Neil" });
    });
    await assertSucceeds(updateDoc(doc(real("carol"), "users/carol"), { consent: "granted" }));
  });

  test("the owner stores the ladderShowAll pref; others cannot", async () => {
    await assertSucceeds(setDoc(doc(real("alice"), "users/alice/prefs/p"), { ladderShowAll: true }, { merge: true }));
    await assertFails(setDoc(doc(real("bob"), "users/alice/prefs/p"), { ladderShowAll: false }, { merge: true }));
  });

  test("anonymous users cannot read or write other users", async () => {
    const db = anon("anon1");
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(setDoc(doc(db, "users/alice"), { isAnonymous: true }));
    await assertFails(getDoc(doc(db, "users/alice/prefs/p")));
  });

  test("only the owner writes; real users read profiles", async () => {
    const db = real("bob");
    await assertSucceeds(getDoc(doc(db, "users/alice")));
    await assertFails(updateDoc(doc(db, "users/alice"), { email: "x@example.com" }));
    await assertFails(getDoc(doc(db, "users/alice/prefs/p")));
    await assertSucceeds(updateDoc(doc(real("alice"), "users/alice"), { displayName: "Alice" }));
    await assertFails(updateDoc(doc(real("alice"), "users/alice"), { country: "GB" }));
  });

  test("signed-out visitors are denied", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice")));
  });
});

describe("notifications", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/notifications/n1"), {
        title: "Hello",
        createdAt: new Date(),
        readAt: null,
      });
    });
  });

  test("the owner reads and lists their notifications", async () => {
    const db = real("alice");
    await assertSucceeds(getDoc(doc(db, "users/alice/notifications/n1")));
    await assertSucceeds(getDocs(query(collection(db, "users/alice/notifications"), where("readAt", "==", null))));
  });

  test("the owner marks one read, unread, and deletes it", async () => {
    const db = real("alice");
    await assertSucceeds(updateDoc(doc(db, "users/alice/notifications/n1"), { readAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, "users/alice/notifications/n1"), { readAt: null }));
    await assertSucceeds(deleteDoc(doc(db, "users/alice/notifications/n1")));
  });

  test("the owner cannot change other fields or create notifications", async () => {
    const db = real("alice");
    await assertFails(updateDoc(doc(db, "users/alice/notifications/n1"), { title: "Changed" }));
    await assertFails(updateDoc(doc(db, "users/alice/notifications/n1"), { readAt: serverTimestamp(), title: "Changed" }));
    await assertFails(updateDoc(doc(db, "users/alice/notifications/n1"), { readAt: "yes" }));
    await assertFails(setDoc(doc(db, "users/alice/notifications/n2"), { title: "Mine", createdAt: serverTimestamp(), readAt: null }));
  });

  test("other users, anonymous sessions and signed-out visitors are denied", async () => {
    for (const db of [real("bob"), anon("alice"), env.unauthenticatedContext().firestore()]) {
      await assertFails(getDoc(doc(db, "users/alice/notifications/n1")));
      await assertFails(getDocs(collection(db, "users/alice/notifications")));
      await assertFails(updateDoc(doc(db, "users/alice/notifications/n1"), { readAt: serverTimestamp() }));
      await assertFails(deleteDoc(doc(db, "users/alice/notifications/n1")));
    }
  });
});

describe("private app data", () => {
  const paths = (uid) => [
    `wealth/${uid}`,
    `wealth/${uid}/assets/a1`,
    `expense/${uid}/transactions/t1`,
    `time/${uid}/sessions/s1`,
  ];

  test("anonymous sessions cannot read or write their own app data", async () => {
    const db = anon("anon1");
    for (const p of paths("anon1")) {
      await assertFails(setDoc(doc(db, p), { a: 1 }));
    }
    await assertFails(getDoc(doc(db, "wealth/anon1")));
    await assertFails(getDoc(doc(db, "t212Creds/anon1")));
    await assertFails(getDoc(doc(db, "config/rates")));
    await assertFails(getDoc(doc(db, "wealth/alice")));
  });

  test("real owners keep access", async () => {
    const db = real("alice");
    for (const p of paths("alice")) {
      await assertSucceeds(setDoc(doc(db, p), { a: 1 }));
    }
    await assertSucceeds(getDoc(doc(db, "wealth/alice")));
    await assertSucceeds(getDoc(doc(db, "t212Creds/alice")));
  });
});

describe("share deck comments", () => {
  test("an anonymous guest comments as themselves", async () => {
    const db = anon("anon1");
    const comment = { authorUid: "anon1", bulletId: "b1", nickname: "Guest", text: "Hi" };
    await assertSucceeds(setDoc(doc(db, "shareDecks/deck/comments/c1"), comment));
    await assertFails(setDoc(doc(db, "shareDecks/deck/comments/c2"), { ...comment, authorUid: "alice" }));
  });
});

describe("family", () => {
  const member = () =>
    env
      .authenticatedContext("m1", {
        email: FAMILY_EMAIL,
        email_verified: true,
        firebase: { sign_in_provider: "google.com" },
      })
      .firestore();

  test("a verified household member reads and makes stamped updates", async () => {
    const db = member();
    await assertSucceeds(getDoc(doc(db, "family/household")));
    await assertSucceeds(getDoc(doc(db, "family/household/feed/f1")));
    await assertSucceeds(
      updateDoc(doc(db, "family/household/feed/f1"), {
        status: "read",
        pending_sync: true,
        updated_by: FAMILY_EMAIL,
        client_updated_at: serverTimestamp(),
      }),
    );
  });

  test("unstamped updates are denied", async () => {
    await assertFails(updateDoc(doc(member(), "family/household/feed/f1"), { status: "read" }));
  });

  test("an admin with the family app reads and makes stamped updates without being a member", async () => {
    const db = real("boss", { admin: true, apps: ["family"] });
    await assertSucceeds(getDoc(doc(db, "family/household")));
    await assertSucceeds(getDoc(doc(db, "family/household/feed/f1")));
    await assertSucceeds(
      updateDoc(doc(db, "family/household/feed/f1"), {
        status: "done",
        pending_sync: true,
        updated_by: "boss@example.com",
        client_updated_at: serverTimestamp(),
      }),
    );
    await assertFails(updateDoc(doc(db, "family/household/feed/f1"), { status: "read" }));
  });

  test("non-members, admins without the family app, unverified members and anonymous users are denied", async () => {
    const unverified = env
      .authenticatedContext("m1", {
        email: FAMILY_EMAIL,
        email_verified: false,
        firebase: { sign_in_provider: "password" },
      })
      .firestore();
    const notQuite = [
      real("alice"),
      real("boss", { admin: true }),
      real("boss", { admin: true, apps: ["wealth"] }),
      real("bob", { apps: ["family"] }),
    ];
    for (const db of [...notQuite, unverified, anon("anon1")]) {
      await assertFails(getDoc(doc(db, "family/household")));
      await assertFails(getDoc(doc(db, "family/household/feed/f1")));
    }
  });
});

describe("family read copies", () => {
  const PATHS = ["parenting/nila", "fitness/anand", "health/kavya"].map((p) => `family/household/${p}/views`);
  const member = () =>
    env
      .authenticatedContext("m1", { email: FAMILY_EMAIL, email_verified: true, firebase: { sign_in_provider: "google.com" } })
      .firestore();

  test("a household member reads every view, one at a time or the whole collection", async () => {
    const db = member();
    for (const views of PATHS) {
      await assertSucceeds(getDoc(doc(db, `${views}/meta`)));
      await assertSucceeds(getDocs(collection(db, views)));
    }
  });

  test("an admin with the family app reads the views too", async () => {
    const db = real("boss", { admin: true, apps: ["family"] });
    for (const views of PATHS) await assertSucceeds(getDocs(collection(db, views)));
  });

  test("nobody writes, deletes or adds a view from a client, members and admins included", async () => {
    const admin = real("boss", { admin: true, apps: ["family"] });
    for (const db of [member(), admin]) {
      for (const views of PATHS) {
        await assertFails(setDoc(doc(db, `${views}/meta`), { person: "x" }));
        await assertFails(updateDoc(doc(db, `${views}/meta`), { person: "x" }));
        await assertFails(setDoc(doc(db, `${views}/summary`), { body: "x" }));
        await assertFails(deleteDoc(doc(db, `${views}/meta`)));
      }
    }
  });

  test("non-members, admins without the family app, unverified members and anonymous users cannot read", async () => {
    const unverified = env
      .authenticatedContext("m1", { email: FAMILY_EMAIL, email_verified: false, firebase: { sign_in_provider: "password" } })
      .firestore();
    const notQuite = [real("alice"), real("boss", { admin: true }), real("boss", { admin: true, apps: ["wealth"] }), real("bob", { apps: ["family"] })];
    for (const db of [...notQuite, unverified, anon("anon1")]) {
      for (const views of PATHS) {
        await assertFails(getDoc(doc(db, `${views}/meta`)));
        await assertFails(getDocs(collection(db, views)));
      }
    }
  });
});

describe("planner", () => {
  const planner = (uid, claims = {}) => real(uid, { apps: ["planner"], ...claims });
  const hash = "a".repeat(64);

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "planner/anand"), { displayName: "Anand", colour: "a" });
      await setDoc(doc(db, "planner/anand/events/e1"), { title: "Standup", allDay: false });
      await setDoc(doc(db, "planner/anand/habits/h1"), { name: "Run", perWeek: 3, archived: false, createdAt: new Date(), updatedAt: new Date() });
      await setDoc(doc(db, "planner/anand/habits/h1/days/2026-01-05"), { done: true });
      await setDoc(doc(db, `plannerKeys/${hash}`), { uid: "anand", label: "iPhone" });
      await setDoc(doc(db, `plannerKeys/${"b".repeat(64)}`), { uid: "kavya", label: "iPhone" });
    });
  });

  const habit = () => ({ name: "Read", perWeek: 5, archived: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

  test("the owner writes their profile and habits and ticks days", async () => {
    const db = planner("anand");
    await assertSucceeds(setDoc(doc(db, "planner/anand"), { displayName: "Anand", colour: "b", updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, "planner/anand/habits/h2"), habit()));
    await assertSucceeds(updateDoc(doc(db, "planner/anand/habits/h1"), { name: "Run more", updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(db, "planner/anand/habits/h1/days/2026-01-06"), { done: true, at: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(db, "planner/anand/habits/h1/days/2026-01-05")));
    await assertSucceeds(getDocs(collection(db, "planner/anand/habits")));
  });

  test("invalid profiles and habits are rejected", async () => {
    const db = planner("anand");
    await assertFails(setDoc(doc(db, "planner/anand"), { displayName: "Anand", colour: "z", updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, "planner/anand/habits/h2"), { ...habit(), perWeek: 8 }));
    await assertFails(setDoc(doc(db, "planner/anand/habits/h2"), { ...habit(), name: "" }));
    await assertFails(setDoc(doc(db, "planner/anand/habits/h1/days/not-a-date"), { done: true, at: serverTimestamp() }));
  });

  test("others cannot read or write habits and days", async () => {
    for (const db of [planner("kavya"), real("boss", { admin: true })]) {
      await assertFails(getDoc(doc(db, "planner/anand/habits/h1")));
      await assertFails(getDocs(collection(db, "planner/anand/habits")));
      await assertFails(getDoc(doc(db, "planner/anand/habits/h1/days/2026-01-05")));
      await assertFails(setDoc(doc(db, "planner/anand/habits/h3"), habit()));
    }
  });

  test("household members and admins read profiles and events but not write them", async () => {
    for (const db of [planner("kavya"), real("boss", { admin: true })]) {
      await assertSucceeds(getDoc(doc(db, "planner/anand")));
      await assertSucceeds(getDocs(collection(db, "planner")));
      await assertSucceeds(getDocs(collection(db, "planner/anand/events")));
      await assertFails(setDoc(doc(db, "planner/anand"), { displayName: "X", colour: "a", updatedAt: serverTimestamp() }));
    }
  });

  test("nobody writes events from a client, owner included", async () => {
    for (const db of [planner("anand"), real("boss", { admin: true })]) {
      await assertFails(setDoc(doc(db, "planner/anand/events/e2"), { title: "x" }));
      await assertFails(updateDoc(doc(db, "planner/anand/events/e1"), { title: "x" }));
      await assertFails(deleteDoc(doc(db, "planner/anand/events/e1")));
    }
  });

  test("users without the planner app, anonymous and signed-out users read nothing", async () => {
    for (const db of [real("alice"), real("bob", { apps: ["family"] }), anon("anon1"), env.unauthenticatedContext().firestore()]) {
      await assertFails(getDoc(doc(db, "planner/anand")));
      await assertFails(getDocs(collection(db, "planner/anand/events")));
    }
  });

  test("keys: create only for yourself, read, list and delete only your own", async () => {
    const db = planner("anand");
    const fresh = "c".repeat(64);
    await assertSucceeds(setDoc(doc(db, `plannerKeys/${fresh}`), { uid: "anand", label: "Phone", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, `plannerKeys/${"d".repeat(64)}`), { uid: "kavya", label: "Phone", createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(db, `plannerKeys/${"e".repeat(64)}`), { uid: "anand", label: "x".repeat(41), createdAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(db, `plannerKeys/${hash}`)));
    await assertFails(getDoc(doc(db, `plannerKeys/${"b".repeat(64)}`)));
    await assertSucceeds(getDocs(query(collection(db, "plannerKeys"), where("uid", "==", "anand"))));
    await assertFails(getDocs(collection(db, "plannerKeys")));
    await assertFails(deleteDoc(doc(db, `plannerKeys/${"b".repeat(64)}`)));
    await assertFails(updateDoc(doc(db, `plannerKeys/${hash}`), { label: "new" }));
    await assertSucceeds(deleteDoc(doc(db, `plannerKeys/${hash}`)));
  });

  test("keys cannot be created without the planner app", async () => {
    await assertFails(setDoc(doc(real("alice"), `plannerKeys/${"c".repeat(64)}`), { uid: "alice", label: "Phone", createdAt: serverTimestamp() }));
  });
});

describe("devices", () => {
  const device = (over = {}) => ({
    app: "nila",
    platform: "ios",
    fcmToken: "tok",
    apnsEnv: "sandbox",
    timezone: "Europe/London",
    updatedAt: serverTimestamp(),
    ...over,
  });

  test("a real owner creates, updates and deletes their device docs", async () => {
    const db = real("alice");
    const ref = doc(db, "users/alice/devices/inst-1");
    await assertSucceeds(setDoc(ref, device()));
    await assertSucceeds(setDoc(ref, device({
      liveActivityStartToken: "start",
      liveActivities: { "sleep:s1": { updateToken: "u", startedAt: new Date() } },
    })));
    await assertSucceeds(deleteDoc(ref));
  });

  test("fields, types and sizes are validated", async () => {
    const ref = doc(real("alice"), "users/alice/devices/inst-1");
    await assertFails(setDoc(ref, device({ app: "other" })));
    await assertFails(setDoc(ref, device({ platform: "android" })));
    await assertFails(setDoc(ref, device({ apnsEnv: "dev" })));
    await assertFails(setDoc(ref, device({ fcmToken: "x".repeat(4097) })));
    await assertFails(setDoc(ref, device({ fcmToken: 5 })));
    await assertFails(setDoc(ref, device({ extra: true })));
    await assertFails(setDoc(ref, device({ liveActivities: "no" })));
    const { timezone, ...missing } = device();
    await assertFails(setDoc(ref, missing));
  });

  test("nobody else reads or writes, and anonymous sessions cannot write", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/devices/inst-1"), { app: "nila" });
    });
    for (const db of [real("alice"), real("mallory"), real("boss", { admin: true })]) {
      await assertFails(getDoc(doc(db, "users/alice/devices/inst-1")));
      await assertFails(getDocs(collection(db, "users/alice/devices")));
    }
    await assertFails(setDoc(doc(real("mallory"), "users/alice/devices/inst-2"), device()));
    await assertFails(deleteDoc(doc(real("mallory"), "users/alice/devices/inst-1")));
    await assertFails(setDoc(doc(anon("anon1"), "users/anon1/devices/inst-1"), device()));
  });
});

describe("planner tasks", () => {
  const planner = (uid, claims = {}) => real(uid, { apps: ["planner"], ...claims });
  const task = (over = {}) => ({
    title: "Buy milk",
    dueHasTime: false,
    done: false,
    shared: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const base = { title: "T", dueHasTime: false, done: false, createdAt: new Date(), updatedAt: new Date() };
      await setDoc(doc(db, "planner/anand/tasks/shared1"), { ...base, shared: true });
      await setDoc(doc(db, "planner/anand/tasks/private1"), { ...base, shared: false });
    });
  });

  test("the owner has full access with validated fields", async () => {
    const db = planner("anand");
    await assertSucceeds(setDoc(doc(db, "planner/anand/tasks/t1"), task({ notes: "2 pints", due: new Date(), dueHasTime: true, shared: true })));
    await assertSucceeds(updateDoc(doc(db, "planner/anand/tasks/t1"), { done: true, doneAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(doc(db, "planner/anand/tasks/t1"), { done: false, doneAt: null, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDocs(collection(db, "planner/anand/tasks")));
    await assertSucceeds(deleteDoc(doc(db, "planner/anand/tasks/t1")));
  });

  test("invalid owner writes are rejected", async () => {
    const db = planner("anand");
    await assertFails(setDoc(doc(db, "planner/anand/tasks/t2"), task({ title: "" })));
    await assertFails(setDoc(doc(db, "planner/anand/tasks/t2"), task({ title: "x".repeat(201) })));
    await assertFails(setDoc(doc(db, "planner/anand/tasks/t2"), task({ notes: "x".repeat(2001) })));
    await assertFails(setDoc(doc(db, "planner/anand/tasks/t2"), task({ shared: "yes" })));
    await assertFails(setDoc(doc(db, "planner/anand/tasks/t2"), task({ extra: 1 })));
    await assertFails(setDoc(doc(planner("kavya"), "planner/anand/tasks/t2"), task()));
    await assertFails(setDoc(doc(real("anand"), "planner/anand/tasks/t2"), task()));
  });

  test("household members read only shared tasks and may only tick them", async () => {
    const db = planner("kavya");
    await assertSucceeds(getDoc(doc(db, "planner/anand/tasks/shared1")));
    await assertSucceeds(getDocs(query(collection(db, "planner/anand/tasks"), where("shared", "==", true))));
    await assertFails(getDoc(doc(db, "planner/anand/tasks/private1")));
    await assertFails(getDocs(collection(db, "planner/anand/tasks")));
    await assertSucceeds(updateDoc(doc(db, "planner/anand/tasks/shared1"), { done: true, doneAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "planner/anand/tasks/shared1"), { title: "Hijack", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "planner/anand/tasks/shared1"), { shared: false, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "planner/anand/tasks/private1"), { done: true, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, "planner/anand/tasks/shared1")));
    await assertFails(setDoc(doc(db, "planner/anand/tasks/new"), task({ shared: true })));
  });

  test("users without the planner app and anonymous sessions get nothing", async () => {
    for (const db of [real("alice"), anon("anon1")]) {
      await assertFails(getDoc(doc(db, "planner/anand/tasks/shared1")));
      await assertFails(updateDoc(doc(db, "planner/anand/tasks/shared1"), { done: true, updatedAt: serverTimestamp() }));
    }
  });
});
