// Renders every materials page (chapters, /all article, index.json) with the shared renderer and
// uploads it to the default Storage bucket under materials/ (admin SDK; storage.rules lets only
// admins and the materials app read it). Never deletes old objects.
//
// Emulator (default target; FIREBASE_STORAGE_EMULATOR_HOST defaults to firebase.json's port):
//   npm run publish-materials
// Production (needs the explicit flag; refuses when an emulator host is set):
//   GOOGLE_APPLICATION_CREDENTIALS=scripts/new-service-account.json npm run publish-materials -- --production
//
// Prints counts and total size only.

import path from "node:path";
import dotenv from "dotenv";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { buildMaterialsBundle } from "../common/utils/materials";

const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env.local"), quiet: true });

const EMULATOR_HOST = "127.0.0.1:9199";
const EMULATOR_ENV = ["FIREBASE_STORAGE_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST"];

async function main(): Promise<void> {
  const production = process.argv.includes("--production");
  if (production) {
    const set = EMULATOR_ENV.filter((name) => process.env[name]);
    if (set.length) throw new Error(`--production with ${set.join(", ")} set; unset them.`);
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error("--production needs GOOGLE_APPLICATION_CREDENTIALS.");
    }
  } else {
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= EMULATOR_HOST;
  }
  const projectId = production ? "anandmoghan-me" : "demo-anandmoghan-me";
  const bucketName = `${projectId}.appspot.com`;
  initializeApp({ projectId, storageBucket: bucketName });
  const target = production ? bucketName : `emulator ${process.env.FIREBASE_STORAGE_EMULATOR_HOST}`;

  const objects = buildMaterialsBundle();
  const bucket = getStorage().bucket();
  let bytes = 0;
  for (const object of objects) {
    const data = Buffer.from(object.body, "utf8");
    await bucket.file(object.path).save(data, { contentType: object.contentType, resumable: false });
    bytes += data.length;
  }
  const htmlCount = objects.filter((o) => o.contentType.startsWith("text/html")).length;
  console.log(
    `published ${objects.length} objects (${htmlCount} html, ${objects.length - htmlCount} json), ` +
      `${(bytes / 1024).toFixed(1)} KiB total (${target})`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
