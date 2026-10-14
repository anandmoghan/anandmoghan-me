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
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

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
