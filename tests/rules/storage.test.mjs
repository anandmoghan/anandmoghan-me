// Storage rules tests for the restricted materials (storage.rules).
// Run inside the emulator: `npm run test:rules`.
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { getBytes, ref, uploadString } from "firebase/storage";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX = "materials/index.json";
const CHAPTER = "materials/a-page/01-intro.html";

let env;

function real(uid, claims = {}) {
  return env
    .authenticatedContext(uid, {
      email: `${uid}@example.com`,
      email_verified: true,
      firebase: { sign_in_provider: "google.com" },
      ...claims,
    })
    .storage();
}

const read = (storage, objectPath) => getBytes(ref(storage, objectPath));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-anandmoghan-me",
    storage: { rules: fs.readFileSync(path.join(ROOT, "storage.rules"), "utf-8") },
  });
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const storage = ctx.storage();
    await uploadString(ref(storage, INDEX), '{"pages":[]}', "raw", { contentType: "application/json" });
    await uploadString(ref(storage, CHAPTER), "<section></section>", "raw", { contentType: "text/html" });
    await uploadString(ref(storage, "public/a.txt"), "hi", "raw", { contentType: "text/plain" });
  });
});

after(async () => {
  await env.clearStorage();
  await env.cleanup();
});

describe("materials", () => {
  test("verified user with the materials app reads the index and chapters", async () => {
    const storage = real("kavya", { apps: ["family", "materials"] });
    await assertSucceeds(read(storage, INDEX));
    await assertSucceeds(read(storage, CHAPTER));
  });

  test("verified admin reads", async () => {
    await assertSucceeds(read(real("boss", { admin: true }), CHAPTER));
  });

  test("signed-in user without the app is denied", async () => {
    await assertFails(read(real("plain"), INDEX));
    await assertFails(read(real("other", { apps: ["wealth"] }), CHAPTER));
  });

  test("unverified email with the app is denied", async () => {
    await assertFails(read(real("unverified", { email_verified: false, apps: ["materials"] }), CHAPTER));
    await assertFails(read(real("unverified-admin", { email_verified: false, admin: true }), CHAPTER));
  });

  test("anonymous and signed-out visitors are denied", async () => {
    const anon = env.authenticatedContext("anon", { firebase: { sign_in_provider: "anonymous" } }).storage();
    await assertFails(read(anon, CHAPTER));
    await assertFails(read(env.unauthenticatedContext().storage(), INDEX));
  });

  test("nobody writes from a client, admins included", async () => {
    const storage = real("boss", { admin: true, apps: ["materials"] });
    await assertFails(uploadString(ref(storage, CHAPTER), "x", "raw", { contentType: "text/html" }));
  });
});

describe("public media", () => {
  test("anyone reads public/**", async () => {
    await assertSucceeds(read(env.unauthenticatedContext().storage(), "public/a.txt"));
  });
});
