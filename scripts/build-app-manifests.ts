// Writes the web app manifest of every standalone app (common/apps/standalone/apps.ts) to
// public/apps/<id>.webmanifest (gitignored), before `next dev` and `next build` (npm predev and prebuild).
// Private apps come from NEXT_PUBLIC_PRIVATE_APPS, so the env files are loaded first, as Next does. Manifests
// from an earlier run are deleted, so a build without the private env ships none of theirs.
import { readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = path.join(root, "public", "apps");

async function main() {
  loadEnvConfig(root);
  const { manifestUrl, standaloneApps } = await import("../common/apps/standalone/apps");
  const { webManifest } = await import("../common/apps/standalone/manifest");

  for (const f of readdirSync(appsDir)) if (f.endsWith(".webmanifest")) rmSync(path.join(appsDir, f));
  for (const app of standaloneApps) {
    writeFileSync(path.join(root, "public", manifestUrl(app)), `${JSON.stringify(webManifest(app), null, 2)}\n`);
  }
  console.log(`build-app-manifests: ${standaloneApps.length} manifests`);
}

main();
