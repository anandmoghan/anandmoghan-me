// Rules tests for visits and blog comments (firebase/rules/visitors.rules).
// Run inside the emulator: `npm run test:rules`.
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
  Timestamp,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const POST = "posts/a-post/comments";

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

const admin = () => real("boss", { admin: true });

function comment(uid, extra = {}) {
  return {
    uid,
    displayName: "Guest",
    body: "Nice post",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: "visible",
    ...extra,
  };
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
    const at = Timestamp.fromMillis(Date.now() - 60_000);
    await setDoc(doc(db, "visits/v1"), { uid: "anon1", path: "/", createdAt: at });
    await setDoc(doc(db, `${POST}/shown`), { uid: "anon1", displayName: "A", body: "Hi", createdAt: at, updatedAt: at, status: "visible" });
    await setDoc(doc(db, `${POST}/hidden`), { uid: "anon1", displayName: "A", body: "Spam", createdAt: at, updatedAt: at, status: "hidden" });
    await setDoc(doc(db, "shareDecks/deck/comments/s1"), { authorUid: "anon1", text: "x", createdAt: at });
  });
});

describe("visits", () => {
  test("only admins read; nobody writes from a client", async () => {
    await assertSucceeds(getDoc(doc(admin(), "visits/v1")));
    await assertSucceeds(getDocs(query(collection(admin(), "visits"), orderBy("createdAt", "desc"))));
    for (const db of [real("alice"), anon("anon1"), real("boss", { admin: true, email_verified: false })]) {
      await assertFails(getDoc(doc(db, "visits/v1")));
    }
    await assertFails(setDoc(doc(admin(), "visits/v2"), { uid: "boss", path: "/" }));
    await assertFails(setDoc(doc(anon("anon1"), "visits/v2"), { uid: "anon1", path: "/" }));
  });
});

describe("post comments: create", () => {
  test("anonymous and signed-in sessions comment as themselves", async () => {
    await assertSucceeds(setDoc(doc(anon("anon2"), `${POST}/c1`), comment("anon2")));
    await assertSucceeds(setDoc(doc(real("alice"), `${POST}/c2`), comment("alice")));
  });

  test("signed-out visitors cannot comment", async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), `${POST}/c1`), comment("x")));
  });

  test("author must be the caller", async () => {
    await assertFails(setDoc(doc(anon("anon2"), `${POST}/c1`), comment("alice")));
  });

  test("body and name sizes are enforced", async () => {
    const db = anon("anon2");
    await assertSucceeds(setDoc(doc(db, `${POST}/max`), comment("anon2", { body: "x".repeat(2000) })));
    await assertFails(setDoc(doc(db, `${POST}/long`), comment("anon2", { body: "x".repeat(2001) })));
    await assertFails(setDoc(doc(db, `${POST}/empty`), comment("anon2", { body: "" })));
    await assertFails(setDoc(doc(db, `${POST}/num`), comment("anon2", { body: 5 })));
    await assertFails(setDoc(doc(db, `${POST}/name`), comment("anon2", { displayName: "n".repeat(41) })));
    await assertFails(setDoc(doc(db, `${POST}/noname`), comment("anon2", { displayName: "" })));
  });

  test("timestamps must be the request time", async () => {
    const db = anon("anon2");
    const past = Timestamp.fromMillis(Date.now() - 86_400_000);
    await assertFails(setDoc(doc(db, `${POST}/c1`), comment("anon2", { createdAt: past })));
    await assertFails(setDoc(doc(db, `${POST}/c2`), comment("anon2", { updatedAt: past })));
  });

  test("new comments are visible and carry only the known fields", async () => {
    const db = anon("anon2");
    await assertFails(setDoc(doc(db, `${POST}/c1`), comment("anon2", { status: "hidden" })));
    await assertFails(setDoc(doc(db, `${POST}/c2`), comment("anon2", { extra: true })));
    const { status, ...missing } = comment("anon2");
    await assertFails(setDoc(doc(db, `${POST}/c3`), missing));
  });

  test("slug must look like a post slug", async () => {
    await assertFails(setDoc(doc(anon("anon2"), "posts/Bad Slug/comments/c1"), comment("anon2")));
  });
});

describe("post comments: read", () => {
  test("anyone, signed out included, lists visible comments", async () => {
    const q = (db) => query(collection(db, POST), where("status", "==", "visible"), orderBy("createdAt", "asc"));
    await assertSucceeds(getDocs(q(env.unauthenticatedContext().firestore())));
    await assertSucceeds(getDocs(q(anon("anon2"))));
  });

  test("hidden comments: author and admin only", async () => {
    await assertFails(getDoc(doc(anon("anon2"), `${POST}/hidden`)));
    await assertFails(getDocs(query(collection(real("alice"), POST), orderBy("createdAt", "asc"))));
    await assertSucceeds(getDoc(doc(anon("anon1"), `${POST}/hidden`)));
    await assertSucceeds(getDocs(query(collection(admin(), POST), orderBy("createdAt", "asc"))));
  });

  test("collection-group moderation query: admin only", async () => {
    const q = (db) => query(collectionGroup(db, "comments"), orderBy("createdAt", "desc"));
    await assertSucceeds(getDocs(q(admin())));
    await assertFails(getDocs(q(real("alice"))));
    await assertFails(getDocs(q(anon("anon1"))));
  });
});

describe("post comments: update and delete", () => {
  test("author edits the body with a fresh updatedAt", async () => {
    const db = anon("anon1");
    await assertSucceeds(updateDoc(doc(db, `${POST}/shown`), { body: "Edited", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, `${POST}/shown`), { body: "No time" }));
    await assertFails(updateDoc(doc(db, `${POST}/shown`), { body: "x".repeat(2001), updatedAt: serverTimestamp() }));
  });

  test("author cannot unhide, rename or reassign", async () => {
    const db = anon("anon1");
    await assertFails(updateDoc(doc(db, `${POST}/hidden`), { status: "visible" }));
    await assertFails(updateDoc(doc(db, `${POST}/shown`), { displayName: "Other", updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, `${POST}/shown`), { uid: "anon2", updatedAt: serverTimestamp() }));
  });

  test("others cannot edit or delete", async () => {
    for (const db of [anon("anon2"), real("alice")]) {
      await assertFails(updateDoc(doc(db, `${POST}/shown`), { body: "Mine now", updatedAt: serverTimestamp() }));
      await assertFails(updateDoc(doc(db, `${POST}/shown`), { status: "hidden" }));
      await assertFails(deleteDoc(doc(db, `${POST}/shown`)));
    }
  });

  test("admin hides and unhides, but does not edit the body", async () => {
    await assertSucceeds(updateDoc(doc(admin(), `${POST}/shown`), { status: "hidden" }));
    await assertSucceeds(updateDoc(doc(admin(), `${POST}/hidden`), { status: "visible" }));
    await assertFails(updateDoc(doc(admin(), `${POST}/shown`), { status: "deleted" }));
    await assertFails(updateDoc(doc(admin(), `${POST}/shown`), { body: "Admin edit", updatedAt: serverTimestamp() }));
  });

  test("author and admin delete", async () => {
    await assertSucceeds(deleteDoc(doc(anon("anon1"), `${POST}/shown`)));
    await assertSucceeds(deleteDoc(doc(admin(), `${POST}/hidden`)));
  });
});

function read(slug, extra = {}) {
  return {
    slug,
    title: "A post",
    lastReadAt: serverTimestamp(),
    progress: 0.5,
    lastHeadingId: "intro",
    ...extra,
  };
}

describe("reading history", () => {
  const A = "users/anon1/reads/a-post";

  test("owner, anonymous or signed in, writes and reads their own history", async () => {
    await assertSucceeds(setDoc(doc(anon("anon1"), A), read("a-post")));
    await assertSucceeds(getDoc(doc(anon("anon1"), A)));
    await assertSucceeds(updateDoc(doc(anon("anon1"), A), { progress: 0.75, lastReadAt: serverTimestamp() }));
    await assertSucceeds(setDoc(doc(real("alice"), "users/alice/reads/a-post"), read("a-post")));
    await assertSucceeds(getDocs(query(collection(anon("anon1"), "users/anon1/reads"), orderBy("lastReadAt", "desc"))));
    await assertSucceeds(deleteDoc(doc(anon("anon1"), A)));
  });

  test("materials slugs use __ for the slash in the document id", async () => {
    const db = anon("anon1");
    await assertSucceeds(setDoc(doc(db, "users/anon1/reads/materials:llm__attention"), read("materials:llm/attention")));
    await assertFails(setDoc(doc(db, "users/anon1/reads/materials:llm-attention"), read("materials:llm/attention")));
  });

  test("nobody else reads or writes it, not even admins; signed-out cannot", async () => {
    await assertSucceeds(setDoc(doc(anon("anon1"), A), read("a-post")));
    for (const db of [anon("anon2"), real("alice"), admin(), env.unauthenticatedContext().firestore()]) {
      await assertFails(getDoc(doc(db, A)));
      await assertFails(setDoc(doc(db, A), read("a-post")));
      await assertFails(deleteDoc(doc(db, A)));
    }
  });

  test("fields are validated", async () => {
    const db = anon("anon1");
    await assertFails(setDoc(doc(db, A), read("a-post", { progress: 1.5 })));
    await assertFails(setDoc(doc(db, A), read("a-post", { progress: -0.1 })));
    await assertFails(setDoc(doc(db, A), read("a-post", { progress: "half" })));
    await assertSucceeds(setDoc(doc(db, A), read("a-post", { progress: 1 })));
    await assertFails(setDoc(doc(db, A), read("a-post", { title: "" })));
    await assertFails(setDoc(doc(db, A), read("a-post", { title: "t".repeat(301) })));
    await assertFails(setDoc(doc(db, A), read("a-post", { lastHeadingId: "h".repeat(201) })));
    await assertFails(setDoc(doc(db, A), read("a-post", { slug: "Other Post" })));
    await assertFails(setDoc(doc(db, A), read("other-post")));
    await assertFails(setDoc(doc(db, A), read("a-post", { extra: true })));
    const { lastHeadingId, ...missing } = read("a-post");
    await assertFails(setDoc(doc(db, A), missing));
  });

  test("lastReadAt must be the request time", async () => {
    const past = Timestamp.fromMillis(Date.now() - 86_400_000);
    await assertFails(setDoc(doc(anon("anon1"), A), read("a-post", { lastReadAt: past })));
  });
});
